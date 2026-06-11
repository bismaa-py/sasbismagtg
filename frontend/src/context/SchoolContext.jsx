import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { getUploadUrl } from '../utils/urlHelper';

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSchoolInfo = async () => {
    try {
      const res = await api.get('/sekolah');
      if (res.data.success) {
        setSchoolInfo(res.data.data);
      }
    } catch (e) {
      console.error('Gagal mengambil informasi sekolah:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  useEffect(() => {
    if (schoolInfo) {
      const faviconUrl = schoolInfo.logo_sekolah 
        ? getUploadUrl(schoolInfo.logo_sekolah) 
        : "/logo.png";
      
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
      
      if (schoolInfo.logo_sekolah) {
        if (schoolInfo.logo_sekolah.endsWith('.png')) {
          link.type = 'image/png';
        } else if (schoolInfo.logo_sekolah.endsWith('.jpg') || schoolInfo.logo_sekolah.endsWith('.jpeg')) {
          link.type = 'image/jpeg';
        } else if (schoolInfo.logo_sekolah.endsWith('.svg')) {
          link.type = 'image/svg+xml';
        }
      } else {
        link.type = 'image/png';
      }
    }
  }, [schoolInfo]);

  return (
    <SchoolContext.Provider value={{ schoolInfo, loading, refreshSchoolInfo: fetchSchoolInfo }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within SchoolProvider');
  }
  return context;
}
