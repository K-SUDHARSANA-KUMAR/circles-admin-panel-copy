import NavKeys from './navkeys';

export type BreadcrumbMode = 'create' | 'edit' | 'view';

type BreadcrumbCommon = {
  homeHref: string;
  homeLabel: string;
  backHref: string;
};

type BreadcrumbDynamic = {
  pageTitle: string;
  subtitle: string;
  currentPage: string;
};

type BreadcrumbEntry = BreadcrumbCommon & {
  create: BreadcrumbDynamic;
  edit: BreadcrumbDynamic;
  view?: BreadcrumbDynamic;
};

export const breadcrumbConfig: Record<string, BreadcrumbEntry> = {
  //dashboard
  target: {
    homeHref: NavKeys.Target,
    homeLabel: 'Targets',
    backHref: NavKeys.Target,
    create: {
      pageTitle: 'Add Target',
      subtitle: 'Provide information to create target',
      currentPage: 'Add Target',
    },
    edit: {
      pageTitle: 'Edit Target',
      subtitle: 'Update target information',
      currentPage: 'Edit Target',
    },
    view: {
      pageTitle: 'View Target',
      subtitle: 'View target information and progress',
      currentPage: 'View Target',
    },
  },
  schemes: {
    homeHref: NavKeys.DashboardSchemes,
    homeLabel: 'Schemes',
    backHref: NavKeys.DashboardSchemes,
    create: {
      pageTitle: 'Create New Scheme',
      subtitle: 'Provide information to create a scheme',
      currentPage: 'Create Scheme',
    },
    edit: {
      pageTitle: 'Edit Scheme',
      subtitle: 'Update scheme information',
      currentPage: 'Edit Scheme',
    },
    view: {
      pageTitle: 'View Scheme',
      subtitle: 'View scheme information',
      currentPage: 'View Scheme',
    },
  },
  product: {
    homeHref: NavKeys.DashboardProducts,
    homeLabel: 'Products',
    backHref: NavKeys.DashboardProducts,
    create: {
      pageTitle: 'Create New Product',
      subtitle: 'Provide information to create product',
      currentPage: 'Create Product',
    },
    edit: {
      pageTitle: 'Edit Product',
      subtitle: 'Update product information',
      currentPage: 'Edit Product',
    },
    view: {
      pageTitle: 'View Product',
      subtitle: 'Review product information',
      currentPage: 'View Product',
    },
  },
  permissions: {
    homeHref: NavKeys.Permissions,
    homeLabel: 'Permissions',
    backHref: NavKeys.Permissions,
    create: {
      pageTitle: 'Create New Permission',
      subtitle: 'Provide information to create Permission',
      currentPage: 'Create Permission',
    },
    edit: {
      pageTitle: 'Edit Permission',
      subtitle: 'Update Permission information',
      currentPage: 'Edit Permission',
    },
    view: {
      pageTitle: 'View Permission',
      subtitle: 'View permission details',
      currentPage: 'View Permission',
    },
  },
  permissionGroups: {
    homeHref: NavKeys.PermissionGroups,
    homeLabel: 'Permissions',
    backHref: NavKeys.PermissionGroups,
    create: {
      pageTitle: 'Create New Permission Group',
      subtitle: 'Provide information to create Permission Group',
      currentPage: 'Create Permission Group',
    },
    edit: {
      pageTitle: 'Edit Permission Group',
      subtitle: 'Update Permission Group information',
      currentPage: 'Edit Permission Group',
    },
    view: {
      pageTitle: 'View Permission Group',
      subtitle: 'View Permission Group details',
      currentPage: 'View Permission Group',
    },
  },
  pjp: {
    homeHref: NavKeys.DashboardJourneyPlan,
    homeLabel: 'PJP',
    backHref: NavKeys.Pjp,
    create: {
      pageTitle: 'Sales Person View',
      subtitle: 'Provide information to confirm collection',
      currentPage: 'Create Plan',
    },
    edit: {
      pageTitle: 'Edit Sales Person Plan',
      subtitle: 'Update collection plan details',
      currentPage: 'Edit Plan',
    },
    view: {
      pageTitle: 'Sales Person PJP View',
      subtitle: 'View sales person journey plan details',
      currentPage: 'View Plan',
    },
  },
  warehouse: {
    homeHref: NavKeys.Warehouse,
    homeLabel: 'Warehouse',
    backHref: NavKeys.Warehouse,
    create: {
      pageTitle: 'Create New Warehouse',
      subtitle: 'Provide information to create a warehouse',
      currentPage: 'Create Warehouse',
    },
    edit: {
      pageTitle: 'Edit Warehouse',
      subtitle: 'Update warehouse information',
      currentPage: 'Edit Warehouse',
    },
  },
  outlet: {
    homeHref: NavKeys.Outlets,
    homeLabel: 'Outlet',
    backHref: NavKeys.Outlets,
    create: {
      pageTitle: 'Create New Outlet',
      subtitle: 'Provide information to create a outlet',
      currentPage: 'Create Outlet',
    },
    edit: {
      pageTitle: 'Edit Outlet',
      subtitle: 'Update Outlet information',
      currentPage: 'Edit Outlet',
    },
  },
  outletFromBeats: {
    homeHref: NavKeys.Beats,
    homeLabel: 'Beats',
    backHref: NavKeys.Beats,
    create: {
      pageTitle: 'Create New Outlet',
      subtitle: 'Provide information to create a outlet',
      currentPage: 'Create Outlet',
    },
    edit: {
      pageTitle: 'Edit Outlet',
      subtitle: 'Update Outlet information',
      currentPage: 'Edit Outlet',
    },
  },
  expenses: {
    homeHref: NavKeys.Expenses,
    homeLabel: 'Expenses',
    backHref: NavKeys.ExpensesList,
    create: {
      pageTitle: 'Expense Submission',
      subtitle: 'Fill in your expense details',
      currentPage: 'Submit Expenses',
    },
    edit: {
      pageTitle: 'Edit Expense',
      subtitle: 'Update your expense details',
      currentPage: 'Edit Expenses',
    },
  },
  pincode: {
    homeHref: NavKeys.Pincode,
    homeLabel: 'Pincode',
    backHref: NavKeys.Pincode,
    create: {
      pageTitle: 'Create New Pincode',
      subtitle: 'Provide information to create pincode',
      currentPage: 'Create Pincode',
    },
    edit: {
      pageTitle: 'Edit Pincode',
      subtitle: 'Update pincode information',
      currentPage: 'Edit Pincode',
    },
  },
  masterShema: {
    homeHref: NavKeys.MasterSchema,
    homeLabel: 'Master Schema',
    backHref: NavKeys.MasterSchema,
    create: {
      pageTitle: 'Create Master Schema',
      subtitle: 'Provide information to create master schema',
      currentPage: 'Create Schema',
    },
    edit: {
      pageTitle: 'Edit Master Schema',
      subtitle: 'Update schema details',
      currentPage: 'Edit Schema',
    },
  },
  configuration: {
    homeHref: NavKeys.Configurations,
    homeLabel: 'Configurations',
    backHref: NavKeys.Configurations,
    create: {
      pageTitle: 'Create Configuration',
      subtitle: 'Provide information to create configuration',
      currentPage: 'Create Configuration',
    },
    edit: {
      pageTitle: 'Configuration Modification',
      subtitle: 'Modify the configuration for the selected context',
      currentPage: 'Configuration Modification',
    },
  },
  formManagement: {
    homeHref: NavKeys.ConfigForm,
    homeLabel: 'Form Management',
    backHref: NavKeys.ConfigForm,
    create: {
      pageTitle: 'Create Form',
      subtitle: 'Add field to create new form',
      currentPage: 'Create Form',
    },
    edit: {
      pageTitle: 'Modification Form',
      subtitle: 'Modify the form',
      currentPage: 'Modification Form',
    },
  },
  claimsConfig: {
    homeHref: NavKeys.ClaimConfigLimit,
    homeLabel: 'Claims Config',
    backHref: NavKeys.ClaimConfigLimit,
    create: {
      pageTitle: 'Add Claim',
      subtitle: 'Provide information to create claim',
      currentPage: 'Add Claim',
    },
    edit: {
      pageTitle: 'Edit Claim',
      subtitle: 'Update claim information',
      currentPage: 'Edit Claim',
    },
  },
  manualPjp: {
    homeHref: NavKeys.ManualPjp,
    homeLabel: 'Manual PJP',
    backHref: NavKeys.ManualPjp,
    create: {
      pageTitle: 'Create Manual PJP',
      subtitle: 'Provide information to create manual pjp',
      currentPage: 'Create Manual PJP',
    },
    edit: {
      pageTitle: 'Edit Manual PJP',
      subtitle: 'Update manual pjp information',
      currentPage: 'Edit Manual PJP',
    },
  },
  deviationsManage: {
    homeHref: NavKeys.Deviations,
    homeLabel: 'Deviations',
    backHref: NavKeys.Deviations,
    create: {
      pageTitle: 'Create Deviation',
      subtitle: 'Provide information to create deviation',
      currentPage: 'Create Deviation',
    },
    edit: {
      pageTitle: 'Edit Deviation',
      subtitle: 'Update deviation information',
      currentPage: 'Edit Deviation',
    },
  },
  pricingGroup: {
    homeHref: NavKeys.PriceGroup,
    homeLabel: 'Customer Groups',
    backHref: NavKeys.PriceGroup,
    create: {
      pageTitle: 'Create Customer Group',
      subtitle: 'Provide information to create a customer group',
      currentPage: 'Create Customer Group',
    },
    edit: {
      pageTitle: 'Edit Customer Group',
      subtitle: 'Update customer group information',
      currentPage: 'Edit Customer Group',
    },
  },
  grnOverview: {
    homeHref: NavKeys.Grn,
    homeLabel: 'GRN Receipt Note Approval',
    backHref: NavKeys.Grn,
    create: {
      pageTitle: 'GRN Overview',
      subtitle: 'Verify GRN details',
      currentPage: 'GRN Overview',
    },
    edit: {
      pageTitle: 'GRN Overview',
      subtitle: 'Verify GRN details',
      currentPage: 'GRN Overview',
    },
  },
  grnOutletView: {
    homeHref: NavKeys.Grn,
    homeLabel: 'GRN Receipt Note Approval',
    backHref: NavKeys.Grn,
    create: {
      pageTitle: 'Outlet View',
      subtitle: 'Verify outlet order details',
      currentPage: 'Outlet View',
    },
    edit: {
      pageTitle: 'Outlet View',
      subtitle: 'Verify outlet order details',
      currentPage: 'Outlet View',
    },
  },
  order: {
    homeHref: NavKeys.DashboardOrders,
    homeLabel: 'Orders',
    backHref: NavKeys.DashboardOrders,
    create: {
      pageTitle: 'Create Order',
      subtitle: 'Create a new order',
      currentPage: 'Create Order',
    },
    edit: {
      pageTitle: 'Edit Order',
      subtitle: 'Update order information',
      currentPage: 'Edit Order',
    },
    view: {
      pageTitle: 'Order Details',
      subtitle: 'View order information',
      currentPage: 'Order Details',
    },
  },
  user: {
    homeHref: NavKeys.Users,
    homeLabel: 'Users',
    backHref: NavKeys.Users,
    create: {
      pageTitle: 'Create User',
      subtitle: 'Add a new user to the system',
      currentPage: 'Create User',
    },
    edit: {
      pageTitle: 'Edit User',
      subtitle: 'Update user information',
      currentPage: 'Edit User',
    },
  },
  pjpConfig: {
    homeHref: NavKeys.PjpConfig,
    homeLabel: 'PJP Config',
    backHref: NavKeys.PjpConfig,
    create: {
      pageTitle: 'Create PJP Configuration',
      subtitle: 'Provide information to create PJP configuration',
      currentPage: 'Create Configuration',
    },
    edit: {
      pageTitle: 'Edit PJP Configuration',
      subtitle: 'Update PJP configuration information',
      currentPage: 'Edit Configuration',
    },
  },
  invoice: {
    homeHref: NavKeys.Invoices,
    homeLabel: 'Invoices',
    backHref: NavKeys.Invoices,
    create: {
      pageTitle: 'Create Invoice',
      subtitle: 'Create a new invoice',
      currentPage: 'Create Invoice',
    },
    edit: {
      pageTitle: 'Edit Invoice',
      subtitle: 'Update invoice information',
      currentPage: 'Edit Invoice',
    },
    view: {
      pageTitle: 'Invoice Details',
      subtitle: 'View invoice information',
      currentPage: 'Invoice Details',
    },
  },
};

export function getBreadcrumbData(
  sectionKey: keyof typeof breadcrumbConfig,
  mode: BreadcrumbMode
) {
  const section = breadcrumbConfig[sectionKey];
  const modeData = section[mode];
  console.log(modeData,'modeData')
  
  if (!modeData) {
    throw new Error(`Breadcrumb configuration not found for ${sectionKey} in ${mode} mode`);
  }
  
  return {
    homeHref: section.homeHref,
    homeLabel: section.homeLabel,
    backHref: section.backHref,
    ...modeData,
  };
}
