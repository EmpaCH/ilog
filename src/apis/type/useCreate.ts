import { useMutation } from '@tanstack/react-query';
import { createType } from './typeAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useCreateType = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: ({
      code,
      prefix,
      description,
    }: {
      code: string;
      prefix: string;
      description: string;
    }) => {
      return createType(
        apiFacade,
        code.toUpperCase(),
        prefix.toUpperCase(),
        description,
      );
    },
  });
};
