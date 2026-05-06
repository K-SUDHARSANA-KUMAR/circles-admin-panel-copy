import { format } from "date-fns";
import documentValidator from "./document.validator";

export const generateMonthOptions = () => {
  const months = [];
  for (let month = 0; month < 12; month++) {
    const date = new Date(new Date().getFullYear(), month, 1);
    const value = format(date, 'MM');
    const label = format(date, 'MMMM');
    months.push({ value, label });
  }
  return months;
};

// Generate a UUID v4
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Construct CloudFront URL for image display
export const getCloudFrontUrl = (s3FileName: string): string => {
  if (!s3FileName) return '';
  
  // If it's already a full URL, return as is
  if (s3FileName.startsWith('http')) {
    return s3FileName;
  }
  
  // If it's already a CloudFront URL, return as is
  if (s3FileName.includes('cloudfront.net')) {
    return s3FileName;
  }
  
  // Construct CloudFront URL
  return `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/${s3FileName}`;

};

// Validate PAN (Permanent Account Number)
export const validatePAN = (pan: string): { isValid: boolean; message?: string } => {
  if (!pan) {
    return { isValid: false, message: 'PAN is required' };
  }

  const isValid = documentValidator.validatePAN(pan);
  
  if (!isValid) {
    return { 
      isValid: false, 
      message: 'PAN must be in format: ABCDE1234F (5 letters + 4 digits + 1 letter)' 
    };
  }

  return { isValid: true };
};

// Validate GST (Goods and Services Tax)
export const validateGST = (gst: string): { isValid: boolean; message?: string } => {
  if (!gst) {
    return { isValid: false, message: 'GST is required' };
  }

  const isValid = documentValidator.validateGSTIN(gst);
  
  if (!isValid) {
    return { 
      isValid: false, 
      message: 'GST must be in format: 22AAAAA0000A1Z5 (2 digits + 10 char PAN + 1 entity char + Z + 1 checksum)' 
    };
  }

  return { isValid: true };
};

// Validate FSSAI (Food Safety and Standards Authority of India)
export const validateFSSAI = (fssai: string): { isValid: boolean; message?: string } => {
  if (!fssai) {
    return { isValid: false, message: 'FSSAI is required' };
  }

  const isValid = documentValidator.validateFSSAI(fssai);
  
  if (!isValid) {
    return { 
      isValid: false, 
      message: 'FSSAI must be 14 digits' 
    };
  }

  return { isValid: true };
};

// Validate Aadhaar
export const validateAadhaar = (aadhaar: string): { isValid: boolean; message?: string } => {
  if (!aadhaar) {
    return { isValid: false, message: 'Aadhaar is required' };
  }

  const isValid = documentValidator.validateAadhaar(aadhaar);
  
  if (!isValid) {
    return { 
      isValid: false, 
      message: 'Aadhaar must be 12 digits, cannot start with 0 or 1, and must have valid checksum' 
    };
  }

  return { isValid: true };
};

// Validate Driving License
export const validateDrivingLicense = (license: string): { isValid: boolean; message?: string } => {
  if (!license) {
    return { isValid: false, message: 'Driving License is required' };
  }

  const isValid = documentValidator.validateDrivingLicense(license);
  
  if (!isValid) {
    return { 
      isValid: false, 
      message: 'Driving License must be in format: AB12 2023 1234567 (2 letters + 2 digits + 4 digits + 7 digits)' 
    };
  }

  return { isValid: true };
};

// Validate Trade License
export const validateTradeLicense = (license: string): { isValid: boolean; message?: string } => {
  if (!license) {
    return { isValid: false, message: 'Trade License is required' };
  }

  // Remove spaces
  const cleanLicense = license.replace(/\s/g, '');
  
  // Trade License format: Usually alphanumeric, minimum 6 characters
  if (cleanLicense.length < 6) {
    return { 
      isValid: false, 
      message: 'Trade License must be at least 6 characters' 
    };
  }

  return { isValid: true };
};

// Validate KYC (Know Your Customer)
export const validateKYC = (kyc: string): { isValid: boolean; message?: string } => {
  if (!kyc) {
    return { isValid: true }; // KYC number is optional
  }

  // Remove spaces and convert to uppercase
  const cleanKYC = kyc.replace(/\s/g, '').toUpperCase();
  
  // KYC can be alphanumeric, minimum 6 characters
  if (cleanKYC.length < 6) {
    return { 
      isValid: false, 
      message: 'KYC number must be at least 6 characters' 
    };
  }

  return { isValid: true };
};

// Generic document validation based on type
export const validateDocument = (documentType: string, value: string): { isValid: boolean; message?: string } => {
  switch (documentType) {
    case 'PAN':
      return validatePAN(value);
    case 'GST':
      return validateGST(value);
    case 'KYC':
      return validateKYC(value);
    case 'FSSAI':
      return validateFSSAI(value);
    case 'TRADE_LICENSE':
      return validateTradeLicense(value);
    case 'aadhar':
    case 'aadhaar':
    case 'AADHAAR':
      return validateAadhaar(value);
    case 'driving-license':
    case 'DRIVING_LICENSE':
      return validateDrivingLicense(value);
    default:
      return { isValid: true }; // No validation for unknown types
  }
};