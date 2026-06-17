import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('/', { path: '/socket.io' });

export const useSocket = () => {
  useEffect(() => {
    socket.on('connect', () => console.log('Socket connected'));
    return () => socket.off('connect');
  }, []);

  return socket;
};
