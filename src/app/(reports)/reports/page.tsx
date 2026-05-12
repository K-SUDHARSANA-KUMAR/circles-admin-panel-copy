'use client';

import { Button } from '@/components/ui/button';
import { Download, X, Calendar, Check, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { WarehouseMultiSelectModal } from '@/components/modals/warehouse-multiselect-modal';
import { UserMultiSelectModal, UserOption } from '@/components/modals/user-multiselect-modal';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useUsers } from '@/features/user-managment/users/hooks/useUsers';
import { srRatingApi } from '@/features/reports/sr-rating/api/sr-rating';
import { flexiPayApi } from '@/features/reports/flexi-pay/api/flexi-pay';

// Import SVG icons from assets
import OutletIconSvg from '@/assets/svgs/outleticon.svg';
import ClaimIconSvg from '@/assets/svgs/claimicon.svg';
import SalesIconSvg from '@/assets/svgs/salesicon.svg';
import CollectionIconSvg from '@/assets/svgs/collectionicon.svg';
import FormIconSvg from '@/assets/svgs/formicon.svg';
import OrderIconSvg from '@/assets/svgs/ordericon.svg';
import AttendanceIconSvg from '@/assets/svgs/attendanceicon.svg';
import SRRatingIconSvg from '@/assets/svgs/srratingicon.svg';
import FlexiPayIconSvg from '@/assets/svgs/flexipayratingicom.svg';

// Create React components for SVG icons
const OutletIcon = ({ className }: { className?: string }) => (
  <img src={OutletIconSvg.src} alt="Outlet" className={className} style={{ color: '#7C3AED' }} />
);

const ClaimIcon = ({ className }: { className?: string }) => (
  <img src={ClaimIconSvg.src} alt="Claim" className={className} style={{ color: '#7C3AED' }} />
);

const SalesIcon = ({ className }: { className?: string }) => (
  <img src={SalesIconSvg.src} alt="Sales" className={className} style={{ color: '#7C3AED' }} />
);

const CollectionIcon = ({ className }: { className?: string }) => (
  <img src={CollectionIconSvg.src} alt="Collection" className={className} style={{ color: '#7C3AED' }} />
);

const FormIcon = ({ className }: { className?: string }) => (
  <img src={FormIconSvg.src} alt="Form" className={className} style={{ color: '#7C3AED' }} />
);

const OrderIcon = ({ className }: { className?: string }) => (
  <img src={OrderIconSvg.src} alt="Order" className={className} style={{ color: '#7C3AED' }} />
);

const AttendanceIcon = ({ className }: { className?: string }) => (
  <img src={AttendanceIconSvg.src} alt="Attendance" className={className} style={{ color: '#7C3AED' }} />
);

const SRRatingIcon = ({ className }: { className?: string }) => (
  <img
    src={SRRatingIconSvg.src}
    alt="SR Rating"
    className={className}
    style={{ color: '#7C3AED' }}
  />
);

const FlexiPayIcon = ({ className }: { className?: string }) => (
  <div
    className={className}
    style={{
      backgroundColor: '#7C3AED',
      mask: `url(${FlexiPayIconSvg.src}) no-repeat center`,
      maskSize: 'contain',
      WebkitMask: `url(${FlexiPayIconSvg.src}) no-repeat center`,
      WebkitMaskSize: 'contain',
      width: '32px',
      height: '32px'
    }}
  />
);


const ReportsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');

  // Form state for SR Rating report
  const [srRatingWarehouses, setSrRatingWarehouses] = useState<string[]>([]);
  const [srRatingUsers, setSrRatingUsers] = useState<string[]>([]);
  const [srRatingFromDate, setSrRatingFromDate] = useState<Date | undefined>();
  const [srRatingToDate, setSrRatingToDate] = useState<Date | undefined>();

  // Form state for Flexi Pay report
  const [flexiPayWarehouses, setFlexiPayWarehouses] = useState<string[]>([]);
  const [flexiPayUsers, setFlexiPayUsers] = useState<string[]>([]);
  const [flexiPayFromDate, setFlexiPayFromDate] = useState<Date | undefined>();
  const [flexiPayToDate, setFlexiPayToDate] = useState<Date | undefined>();

  // Modal states
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Data hooks for the existing modals
  const { warehouses } = useWarehouse(undefined, { nonPaginated: true });
  const { users } = useUsers({ nonPaginated: 'true' });

  // Helper functions to get current state based on selected report
  const getCurrentWarehouses = () => {
    return selectedReport === 'SR Rating Report' ? srRatingWarehouses : flexiPayWarehouses;
  };

  const getCurrentUsers = () => {
    return selectedReport === 'SR Rating Report' ? srRatingUsers : flexiPayUsers;
  };

  const getCurrentFromDate = () => {
    return selectedReport === 'SR Rating Report' ? srRatingFromDate : flexiPayFromDate;
  };

  const getCurrentToDate = () => {
    return selectedReport === 'SR Rating Report' ? srRatingToDate : flexiPayToDate;
  };

  const setCurrentWarehouses = (warehouses: string[]) => {
    if (selectedReport === 'SR Rating Report') {
      setSrRatingWarehouses(warehouses);
    } else {
      setFlexiPayWarehouses(warehouses);
    }
  };

  const setCurrentUsers = (users: string[]) => {
    if (selectedReport === 'SR Rating Report') {
      setSrRatingUsers(users);
    } else {
      setFlexiPayUsers(users);
    }
  };

  const setCurrentFromDate = (date: Date | undefined) => {
    if (selectedReport === 'SR Rating Report') {
      setSrRatingFromDate(date);
    } else {
      setFlexiPayFromDate(date);
    }
  };

  const setCurrentToDate = (date: Date | undefined) => {
    if (selectedReport === 'SR Rating Report') {
      setSrRatingToDate(date);
    } else {
      setFlexiPayToDate(date);
    }
  };

  // Transform users data for the modal
  const userOptions: UserOption[] = useMemo(() => {
    const userList = users?.data?.data?.items || [];
    return userList.map((user: any) => {
      return {
        userId: user.userId || user._id,
        name: user.name,
        employeeCode: user.employeeCode,
        userType: user.userType,
        roleId: user.roleId,
        status: user.status,
      };
    });
  }, [users?.data?.data?.items]);

  const handleDownloadClick = (reportTitle: string) => {
    if (reportTitle === 'Outlet Report' || reportTitle === 'SR Rating Report' || reportTitle === 'Flexi Pay Report') {
      setSelectedReport(reportTitle);
      setDownloadError(null); // Clear any previous errors
      setIsModalOpen(true);
    }
  };

  const handleDownload = async () => {
    if (selectedReport === 'SR Rating Report') {
      setIsDownloading(true);
      setDownloadError(null);
      try {
        // Format dates to YYYY-MM-DD format
        const startDate = getCurrentFromDate() ? getCurrentFromDate()!.toISOString().split('T')[0] : '';
        const endDate = getCurrentToDate() ? getCurrentToDate()!.toISOString().split('T')[0] : '';

        console.log('SR Rating Report download initiated:', {
          warehouses: getCurrentWarehouses(),
          users: getCurrentUsers(),
          startDate,
          endDate
        });

        // Use API to download the report
        const blob = await srRatingApi.downloadReport({
          warehouseIds: getCurrentWarehouses(),
          userIds: getCurrentUsers(),
          startDate,
          endDate,
        });

        // Create a temporary link to download the file
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sr-rating-report-${startDate}-to-${endDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        window.URL.revokeObjectURL(url);

        // Close modal after successful download
        setIsModalOpen(false);

      } catch (error: any) {
        console.error('Error downloading SR Rating Report:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        });
        
        let errorMessage = 'Unknown error occurred';
        
        if (error.response?.status === 400) {
          errorMessage = 'Bad request (400). Please check your selected warehouses, users, and date range.';
        } else if (error.response?.status === 502) {
          errorMessage = 'Service temporarily unavailable (502 Bad Gateway). Please check if the report service is running and accessible.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Report endpoint not found (404). Please verify the API endpoint configuration.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Internal server error (500). Please try again later or contact support.';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused. Please check if the report service is running.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setDownloadError(errorMessage);
      } finally {
        setIsDownloading(false);
      }
    } else if (selectedReport === 'Flexi Pay Report') {
      setIsDownloading(true);
      setDownloadError(null);
      try {
        // Format dates to YYYY-MM-DD format
        const startDate = getCurrentFromDate() ? getCurrentFromDate()!.toISOString().split('T')[0] : '';
        const endDate = getCurrentToDate() ? getCurrentToDate()!.toISOString().split('T')[0] : '';

        console.log('Flexi Pay Report download initiated:', {
          warehouses: getCurrentWarehouses(),
          users: getCurrentUsers(),
          startDate,
          endDate
        });

        // Use API to download the report
        const blob = await flexiPayApi.downloadReport({
          warehouseIds: getCurrentWarehouses(),
          userIds: getCurrentUsers(),
          startDate,
          endDate,
        });

        // Create a temporary link to download the file
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flexipay-report-${startDate}-to-${endDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        window.URL.revokeObjectURL(url);

        // Close modal after successful download
        setIsModalOpen(false);

      } catch (error: any) {
        console.error('Error downloading Flexi Pay Report:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        });
        
        let errorMessage = 'Unknown error occurred';
        
        if (error.response?.status === 400) {
          errorMessage = 'Bad request (400). Please check your selected warehouses, users, and date range.';
        } else if (error.response?.status === 502) {
          errorMessage = 'Service temporarily unavailable (502 Bad Gateway). Please check if the report service is running and accessible.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Report endpoint not found (404). Please verify the API endpoint configuration.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Internal server error (500). Please try again later or contact support.';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused. Please check if the report service is running.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setDownloadError(errorMessage);
      } finally {
        setIsDownloading(false);
      }
    } else {
      // Outlet Report logic
      console.log('Outlet Report download - existing logic');
      setIsModalOpen(false);
    }
  };

  const isDownloadEnabled = () => {
    if (selectedReport === 'Outlet Report') {
      return true; // Outlet report has different validation
    }
    // Only start and end dates are mandatory, warehouses and users are optional
    return getCurrentFromDate() && getCurrentToDate();
  };

  // Selection handlers for the new modals
  const handleWarehouseSelectionChange = (ids: string[]) => {
    setCurrentWarehouses(ids);
  };

  const handleUserSelectionChange = (ids: string[]) => {
    setCurrentUsers(ids);
  };

  const reportCards = [
    {
      title: 'Outlet Report',
      icon: OutletIcon,
    },
    {
      title: 'Claim Report',
      icon: ClaimIcon,
    },
    {
      title: 'Sales Report',
      icon: SalesIcon,
    },
    {
      title: 'Collection Report',
      icon: CollectionIcon,
    },
    {
      title: 'Form Report',
      icon: FormIcon,
    },
    {
      title: 'Order Report',
      icon: OrderIcon,
    },
    {
      title: 'Attendance Report',
      icon: AttendanceIcon,
    },
    {
      title: 'SR Rating Report',
      icon: SRRatingIcon,
    },
    {
      title: 'Flexi Pay Report',
      icon: FlexiPayIcon,
    },
  ];

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Reports" />

      {/* White Container Box */}
      <div className="w-full space-y-4 rounded-lg bg-card p-4">
        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((report, index) => (
            <div
              key={index}
              className="bg-card border border-gray-200 rounded-xl p-3"
              style={{
                width: '303px',
                height: '226px',
                opacity: 1,
                borderRadius: '12px',
                borderWidth: '1px',
                padding: '12px'
              }}
            >
              <div
                className="h-32 rounded-lg flex items-center justify-center mb-1"
                style={{
                  opacity: 1,
                  backgroundColor: '#111827'
                }}
              >
                <report.icon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 500,
                    fontSize: '18px'
                  }}
                >
                  {report.title}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-medium rounded-lg transition-colors duration-200"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7C3AED';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#7C3AED';
                  }}
                  style={{
                    borderColor: '#7C3AED',
                    color: '#7C3AED',
                    backgroundColor: 'transparent'
                  }}
                  onClick={() => handleDownloadClick(report.title)}
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#111827' }}
            >
              {selectedReport === 'SR Rating Report' ? (
                <SRRatingIcon className="w-6 h-6" />
              ) : selectedReport === 'Flexi Pay Report' ? (
                <FlexiPayIcon className="w-6 h-6" />
              ) : (
                <OutletIcon className="w-6 h-6" />
              )}
            </div>
            <DialogTitle className="text-xl font-semibold">
              {selectedReport}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selectedReport === 'Outlet Report'
                ? 'Choose a date range and the desired outlet to download.'
                : 'Select warehouse, user, and date range to download the report.'
              }
            </p>

            <div className="space-y-4">
              {/* Warehouse Selection - Show for all reports */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Warehouse {getCurrentWarehouses().length > 0 && `(${getCurrentWarehouses().length} selected)`}
                </label>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setIsWarehouseModalOpen(true)}
                >
                  <span>
                    {getCurrentWarehouses().length === 0
                      ? 'Select Warehouses'
                      : `${getCurrentWarehouses().length} warehouse(s) selected`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* User Selection - Show for SR Rating and Flexi Pay reports */}
              {(selectedReport === 'SR Rating Report' || selectedReport === 'Flexi Pay Report') && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    User {getCurrentUsers().length > 0 && `(${getCurrentUsers().length} selected)`}
                  </label>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setIsUserModalOpen(true)}
                  >
                    <span>
                      {getCurrentUsers().length === 0
                        ? 'Select Users'
                        : `${getCurrentUsers().length} user(s) selected`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Outlet Selection - Show only for Outlet Report */}
              {selectedReport === 'Outlet Report' && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Outlet
                  </label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outlet1">Outlet 1</SelectItem>
                      <SelectItem value="outlet2">Outlet 2</SelectItem>
                      <SelectItem value="outlet3">Outlet 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range - Show for all reports */}
              {selectedReport === 'Outlet Report' ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Date Range
                  </label>
                  <div className="relative">
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              ) : (
                // From Date and To Date for SR Rating and Flexi Pay reports
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      From Date
                    </label>
                    <DatePicker
                      date={getCurrentFromDate()}
                      onSelect={setCurrentFromDate}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      To Date
                    </label>
                    <DatePicker
                      date={getCurrentToDate()}
                      onSelect={setCurrentToDate}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Error Message Display */}
            {downloadError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Download Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {downloadError}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleDownload}
                disabled={!isDownloadEnabled() || isDownloading}
                className={isDownloadEnabled() && !isDownloading
                  ? "bg-primary hover:bg-primary text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warehouse Selection Modal */}
      <WarehouseMultiSelectModal
        open={isWarehouseModalOpen}
        selectedWarehouseIds={getCurrentWarehouses()}
        onChange={handleWarehouseSelectionChange}
        onConfirm={() => setIsWarehouseModalOpen(false)}
        onCancel={() => setIsWarehouseModalOpen(false)}
      />

      {/* User Selection Modal */}
      <UserMultiSelectModal
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        title="Select Users"
        description="Choose users for the report"
        users={userOptions}
        selectedUserIds={getCurrentUsers()}
        onChange={handleUserSelectionChange}
      />
    </section>
  );
};

export default ReportsPage;