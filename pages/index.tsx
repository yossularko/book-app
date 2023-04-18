import { Inter } from "next/font/google";
import {
  Box,
  Button,
  CreateToastFnReturn,
  Flex,
  Input,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import axios, { AxiosError } from "axios";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
}

interface ErrorResponse {
  statusCode: number;
  message: string[];
  error: string;
}

interface CustomHandle401 {
  isCustom401: boolean;
  handle401: () => void;
}

const inter = Inter({ subsets: ["latin"] });

const fetchApi = axios.create({ baseURL: "http://localhost:4000" });
const initialToken = { access_token: "", refresh_token: "" };
const initialInput = { email: "", password: "" };

const errorRes = (
  err: AxiosError<ErrorResponse>,
  toast: CreateToastFnReturn,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  customHandle401?: CustomHandle401
) => {
  const { isCustom401, handle401 } = customHandle401 || {};

  if (err.response?.data) {
    const { statusCode, message } = err.response.data;

    if (isCustom401 && statusCode === 401 && handle401) {
      handle401();
      if (setLoading) {
        setLoading(false);
      }
      return;
    }

    toast({
      status: "error",
      title: statusCode,
      description: JSON.stringify(message),
    });
    return;
  }

  toast({
    status: "error",
    title: err.code,
    description: err.message,
  });
  console.log("error: ", err);
  if (setLoading) {
    setLoading(false);
  }
};

export default function Home() {
  const [token, setToken] = useState(initialToken);
  const [input, setInput] = useState(initialInput);
  const [loading, setLoading] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBook, setLoadingBook] = useState(false);

  const toast = useToast();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchApi.post("/auth/login", input);

      console.log("success login: ", response.data);
      setToken(response.data);
      setLoading(false);
    } catch (error) {
      errorRes(error as AxiosError<ErrorResponse>, toast, setLoading);
    }
  }, [input, toast]);

  const handleLogout = useCallback(() => {
    setToken(initialToken);
    setInput(initialInput);
  }, []);

  const handleRefreshToken = useCallback(async () => {
    try {
      const dataRefresh = {
        refresh_token: token.refresh_token,
      };
      const response = await fetchApi.post("/auth/refresh-token", dataRefresh);

      if (response.status === 201) {
        toast({
          status: "info",
          title: "Refresh",
          description: "Please try again",
        });
      }
    } catch (error) {
      errorRes(error as AxiosError<ErrorResponse>, toast);
    }
  }, [toast, token.refresh_token]);

  const handleGetBook = useCallback(async () => {
    setLoadingBook(true);
    try {
      const response = await fetchApi.get("/books", { withCredentials: true });

      setBooks(response.data);
      setLoadingBook(false);
    } catch (error) {
      errorRes(error as AxiosError<ErrorResponse>, toast, setLoadingBook, {
        isCustom401: true,
        handle401: handleRefreshToken,
      });
    }
  }, [toast, handleRefreshToken]);

  return (
    <Flex className={inter.className}>
      <Flex
        direction="column"
        minH="100vh"
        w="420px"
        bg="gray.900"
        alignItems="center"
        justifyContent="center"
        p={6}
      >
        {!token.refresh_token ? (
          <>
            <Input
              type="email"
              name="email"
              placeholder="input email"
              onChange={handleChange}
              mb={2}
            />
            <Input
              type="password"
              name="password"
              placeholder="input password"
              onChange={handleChange}
              mb={2}
            />
            <Button isLoading={loading} onClick={handleLogin}>
              Login
            </Button>
          </>
        ) : (
          <Button onClick={handleLogout}>Logout</Button>
        )}
      </Flex>
      <Box flex={1} p={6}>
        <Text fontSize="3xl">Get All Books</Text>
        {!token.refresh_token ? null : (
          <>
            <Button isLoading={loadingBook} onClick={handleGetBook}>
              Get Books
            </Button>
            <Box>
              <pre>
                <code>{JSON.stringify(books, null, 2)}</code>
              </pre>
            </Box>
          </>
        )}
      </Box>
    </Flex>
  );
}
