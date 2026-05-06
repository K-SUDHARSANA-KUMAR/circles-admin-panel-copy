export interface AttendancePunch {
  type: 'IN' | 'OUT';
  punchTime: string;
  location: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  selfieImage?: {
    s3Filename: string;
  };
  zingStatus: number;
}

export interface AttendanceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  attendancePunches: AttendancePunch[];
}

export interface SelectedDayData {
  attendancePunches: AttendancePunch[];
  selectedDate: Date;
}