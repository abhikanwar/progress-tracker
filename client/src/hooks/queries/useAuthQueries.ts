import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../lib/api";
import { authStorage } from "../../lib/auth";
import { queryKeys } from "../../lib/queryKeys";

export const useMeQuery = () =>
  useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authApi.me,
    enabled: authStorage.isAuthenticated(),
  });

export const useLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      authApi.login(payload),
    onSuccess: (result) => {
      authStorage.setToken(result.token);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
};

export const useRegisterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      authApi.register(payload),
    onSuccess: (result) => {
      authStorage.setToken(result.token);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
};

export const useChangePasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
};
