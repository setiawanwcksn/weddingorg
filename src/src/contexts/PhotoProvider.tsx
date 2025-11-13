import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiUrl } from "../lib/api";

type PhotoContextType = {
  photoUrl: string | null;
  dashboardUrl: string | null;
  welcomeUrl: string | null;
  refreshPhotos: () => Promise<void>;
};

const PhotoContext = createContext<PhotoContextType>({
  photoUrl: null,
  dashboardUrl: null,
  welcomeUrl: null,
  refreshPhotos: async () => {},
});

export const usePhoto = () => useContext(PhotoContext);

export const PhotoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiRequest, user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [welcomeUrl, setWelcomeUrl] = useState<string | null>(null);

  const loadSinglePhoto = async (prefix: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const res = await apiRequest(apiUrl(`/api/upload/${user.id}_${prefix}/exists`));
      const result = await res.json();

      if (res.ok && result.success && result.exists) {
        return apiUrl(`/api/upload/${result.filename}`);
      }
    } catch {
      console.warn(`Failed to load photo for ${prefix}`);
    }
    return null;
  };

  const loadAll = async () => {
    if (!user) return;
    // gunakan cache local agar cepat
    const cached = localStorage.getItem("photoCache");
    if (cached) {
      const parsed = JSON.parse(cached);
      setPhotoUrl(parsed.photoUrl || null);
      setDashboardUrl(parsed.dashboardUrl || null);
      setWelcomeUrl(parsed.welcomeUrl || null);
    }

    const [p, d, w] = await Promise.all([
      loadSinglePhoto("weddingPhotoUrl"),
      loadSinglePhoto("weddingPhotoUrl_dashboard"),
      loadSinglePhoto("weddingPhotoUrl_welcome"),
    ]);

    const data = { photoUrl: p, dashboardUrl: d, welcomeUrl: w };
    setPhotoUrl(p);
    setDashboardUrl(d);
    setWelcomeUrl(w);
    localStorage.setItem("photoCache", JSON.stringify(data));
  };

  useEffect(() => {
    if (user) loadAll();
    else {
      setPhotoUrl(null);
      setDashboardUrl(null);
      setWelcomeUrl(null);
    }
  }, [user?.id]);

  return (
    <PhotoContext.Provider value={{ photoUrl, dashboardUrl, welcomeUrl, refreshPhotos: loadAll }}>
      {children}
    </PhotoContext.Provider>
  );
};
