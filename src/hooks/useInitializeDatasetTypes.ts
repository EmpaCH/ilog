import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/auth/authContext';
import { ensureImageDatasetType } from '../apis/dataset/ensureDatasetTypes';

/**
 * Hook to initialize required dataset types when the app starts
 * This should be used in your main App component or auth provider
 */
export const useInitializeDatasetTypes = () => {
  const authContext = useContext(AuthContext);
  
  // Return early if context is not available yet
  if (!authContext) {
    return;
  }
  
  const { apiFacade, isAuthenticated } = authContext;

  useEffect(() => {
    const initializeTypes = async () => {
      if (isAuthenticated && apiFacade) {
        try {
          await ensureImageDatasetType(apiFacade);
          console.log('Dataset types initialized successfully');
        } catch (error) {
          console.warn('Failed to initialize dataset types (this may be due to insufficient permissions):', error);
        }
      }
    };

    initializeTypes();
  }, [isAuthenticated, apiFacade]);
};