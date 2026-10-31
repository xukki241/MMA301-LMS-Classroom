let online: boolean | null = null;
export const networkState = {
  isOffline: () => online === false,
  setOnline: (value: boolean | null) => { online = value; },
};

export const OFFLINE_MESSAGE = "Không có kết nối mạng. Vui lòng kết nối Internet và thử lại.";
