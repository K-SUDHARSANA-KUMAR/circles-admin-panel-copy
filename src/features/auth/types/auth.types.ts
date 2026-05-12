import { User } from "@/features/user-managment/users/api/users";

export interface ILoginCredentials {
  phoneNumber?: string;
  username?: string;
  password: string;
  phone_number?: string;
  email?: string;
  fcmToken?: string | null;
  deviceId?: string;
  deviceType?: string;
  platform?: string;
  employeeCode?: string;
}

export interface ILoginResponse {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  user: User | null;
}