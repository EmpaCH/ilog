import { useMutation } from '@tanstack/react-query';
import { createObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useCreateObject = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: ({
      type,
      name,
      location,
      props,
    }: {
      type: string;
      name: string;
      location: string;
      props: { [key: string]: string };
    }) => {
      return createObject(
        apiFacade,
        type,
        name,
        location,
        props,
      );
    },
  });
};
