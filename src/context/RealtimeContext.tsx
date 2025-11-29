import React, { createContext, useContext, useState, useEffect } from "react";

export type RealtimeState = {
  isOnline: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  canStartCall: boolean;
  canPost: boolean;
};

const defaultState: RealtimeState = {
  isOnline: true,
  micEnabled: false,
  camEnabled: false,
  canStartCall: false,
  canPost: true
};

const RealtimeContext = createContext<RealtimeState>(defaultState);

export const useRealtime = () => useContext(RealtimeContext);

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setMicEnabled(stream.getAudioTracks().length > 0);
        setCamEnabled(stream.getVideoTracks().length > 0);
        stream.getTracks().forEach(track => track.stop());
      } catch {
        setMicEnabled(false);
        setCamEnabled(false);
      }
    };

    checkPermissions();
  }, []);

  const realtimeState: RealtimeState = {
    isOnline,
    micEnabled,
    camEnabled,
    canStartCall: isOnline && (micEnabled || camEnabled),
    canPost: true
  };

  return (
    <RealtimeContext.Provider value={realtimeState}>
      {children}
    </RealtimeContext.Provider>
  );
};