import { useContext } from 'react';
import { UserContext } from './UserContextObject';

export function useUser() {
  return useContext(UserContext);
}
