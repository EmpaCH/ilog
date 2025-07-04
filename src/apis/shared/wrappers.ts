import { useMutation, UseMutationOptions } from "@tanstack/react-query";

type Resolver<UserInput, ResolvedInput> = (input: UserInput) =>  ResolvedInput;

export function wrapMutationWithResolver<UserInput, ResolvedInput, Result>(
  useResolvedMutation: (resolvedInput: ResolvedInput) => Promise<Result>,
  resolve: Resolver<UserInput, ResolvedInput>,
  baseOptions?: UseMutationOptions<Result, unknown, ResolvedInput>
) {
  const mutation = useMutation<Result, unknown, ResolvedInput>({
    mutationFn: useResolvedMutation,
    ...baseOptions,
  });
  return {
    ...mutation,
    mutate: (input: UserInput, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate(resolve(input), options),
    mutateAsync: (input: UserInput, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
      mutation.mutateAsync(resolve(input), options),
  };
}