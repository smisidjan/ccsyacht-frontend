// System Admin Authentication API

import type {
  LoginRequest,
  LoginResponse,
  SystemLoginResponse,
  ApiError,
} from "../types";
import { API_BASE_URL } from "./helpers";

export const systemAuthApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/system/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    const responseData: SystemLoginResponse = await response.json();
    // Extract token from nested result object
    return { token: responseData.result.token };
  },
};
