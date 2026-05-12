'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  productFormSchema,
  type ProductFormData,
} from '@/lib/schemas/product-schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/form/form-select';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

import { useProducts } from '@/features/dashboard/products/hooks/useProducts';
import { useFileUpload } from '@/features/common/hooks/useFileUpload';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import NavKeys from '@/constants/navkeys';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { ImageUploadField } from '@/components/image-upload/image-upload';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';

const defaultUomOptions = [
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Gram (g)', value: 'g' },
  { label: 'Litre (l)', value: 'l' },
  { label: 'Piece (pcs)', value: 'pcs' },
];

type UomOption = {
  label: string;
  value: string;
};

const ProductCreatePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedS3FileNames, setUploadedS3FileNames] = useState<string[]>([]);
  const [uomOptions, setUomOptions] = useState<UomOption[]>(defaultUomOptions);
  const [uomIdByName, setUomIdByName] = useState<Record<string, string>>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode');
  const productId = searchParams.get('productId');
  const isEditMode = !!(mode === 'edit' && productId);
  const isViewMode = !!(mode === 'view' && productId);
  const [isEditing, setIsEditing] = useState(isEditMode);
  const breadcrumb = getBreadcrumbData(
    'product',
    isViewMode ? 'view' : isEditMode ? 'edit' : 'create'
  );

  const { createProduct, updateProduct, getProduct } = useProducts();
  const { uploadMultipleFiles } = useFileUpload();

  const productQuery = getProduct(productId || '');
  const productData = productQuery.data?.data;

  const { records: uomRecordsQuery } = useMasterRecords(
    'unitOfMesaurement',
    undefined,
    0,
    200,
    true
  );

  useEffect(() => {
    const rawData = uomRecordsQuery?.data as any;
    if (!rawData) {
      return;
    }

    const extractedRecords = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];

    if (extractedRecords.length === 0) {
      return;
    }

    const mappedOptions: UomOption[] = [];
    const mappedIds: Record<string, string> = {};

    extractedRecords.forEach((record: any) => {
      const name =
        record?.uomName ||
        record?.unitOfMesaurementName ||
        record?.name ||
        '';
      const code =
        record?.code ||
        record?.unitOfMesaurementCode ||
        record?.shortCode ||
        '';
      const unitId =
        record?.unitOfMesaurementId ||
        record?._id ||
        record?.id ||
        record?.code ||
        '';

      if (!name) {
        return;
      }

      mappedOptions.push({
        label: code && code !== name ? `${name} (${code})` : name,
        value: name,
      });

      if (unitId) {
        mappedIds[name.toLowerCase()] = unitId;
      }
    });

    if (mappedOptions.length === 0) {
      return;
    }

    setUomOptions((previousOptions) => {
      const uniqueOptions = new Map<string, UomOption>();

      [...mappedOptions, ...previousOptions].forEach((option) => {
        const normalizedValue = option.value.toLowerCase();
        if (!uniqueOptions.has(normalizedValue)) {
          uniqueOptions.set(normalizedValue, option);
        }
      });

      return Array.from(uniqueOptions.values());
    });

    setUomIdByName((previousMap) => ({
      ...previousMap,
      ...mappedIds,
    }));
  }, [uomRecordsQuery?.data]);

  useEffect(() => {
    if (!productData?.unitOfMesaurement?.uomName) {
      return;
    }

    const productUomName = productData.unitOfMesaurement.uomName;
    const normalizedName = productUomName.toLowerCase();
    const productUomId = productData.unitOfMesaurement.unitOfMesaurementId;

    setUomOptions((previousOptions) => {
      const exists = previousOptions.some(
        (option) => option.value.toLowerCase() === normalizedName
      );
      if (exists) {
        return previousOptions;
      }
      return [...previousOptions, { label: productUomName, value: productUomName }];
    });

    if (productUomId) {
      setUomIdByName((previousMap) => ({
        ...previousMap,
        [normalizedName]: productUomId,
      }));
    }
  }, [productData]);
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      skuCode: '',
      productName: '',
      productImages: [],
      mrp: 0,
      minimumPrice: 0,
      gstPercentage: 0,
      hsnCode: '',
      brand: '',
      category: '',
      subCategory: '',
      capacity: 0,
      baseUom: 'g',
      unitPerCase: [],
      warehouse: [],
    },
  });

  const sizeUom = productData?.size?.uom || form.watch('baseUom') || 'kilogram (kg)';

  // Check if all required data is loaded
  const shouldHydrateForm = (isEditMode || isViewMode) && productId;
  const isDataLoaded = shouldHydrateForm ? productData : true;

  useEffect(() => {
    if ((isEditMode || isViewMode) && isDataLoaded && productData) {
      // First set the category to trigger subcategory loading
      const sizeCapacity =
        productData?.size?.capacity !== undefined &&
          productData?.size?.capacity !== null
          ? Number(productData.size.capacity)
          : undefined;
      const warehouseIds = Array.isArray(productData.mappings)
        ? productData.mappings.map((m: any) => m.warehouseId)
        : [];

      // Handle product images for edit mode
      const existingImages = Array.isArray(productData.productImages)
        ? productData.productImages.map((img: any) => ({
          productS3Filename: img.productS3Filename || img.s3Filename || '',
        }))
        : [];

      const productUomName = productData?.unitOfMesaurement?.uomName;
      const baseUom = productData?.baseUom || productUomName || productData?.uom || '';

      if (productUomName || baseUom) {
        const uomToAdd = productUomName || baseUom;
        setUomOptions((previousOptions) => {
          const hasExistingOption = previousOptions.some(
            (option) => option.value.toLowerCase() === uomToAdd.toLowerCase()
          );
          if (hasExistingOption) {
            return previousOptions;
          }
          return [
            ...previousOptions,
            { label: uomToAdd, value: uomToAdd },
          ];
        });
      }

      // Handle unitPerCase array from productData
      const unitPerCaseData = Array.isArray(productData?.unitPerCase)
        ? productData.unitPerCase.map((item: any) => ({
          numerator: item.numerator || 1,
          buom: item.buom || baseUom,
          denominator: item.denominator || 1,
          auom: item.auom || '',
        }))
        : [];

      form.reset({
        skuCode: productData.skuCode || '',
        productName: productData.productName || '',
        productImages: existingImages,
        mrp: productData.mrp || 0,
        minimumPrice: productData.minimumPrice || 0,
        gstPercentage: productData.gstPercentage || 0,
        hsnCode: productData.hsnCode || '',
        brand: productData.brandId || '',
        category: productData.categoryId || '',
        subCategory: productData.subcategoryId || '',
        capacity: sizeCapacity ?? productData.capacity ?? 0,
        baseUom: baseUom || 'g',
        unitPerCase: unitPerCaseData,
        warehouse: warehouseIds.map((id: string) => ({ warehouseId: id })),
      });

      setTimeout(() => {
        form.setValue('brand', productData.brandId);
        form.setValue('category', productData.categoryId);
        form.setValue('subCategory', productData.subcategoryId);
        form.setValue('baseUom', baseUom || 'g');
      }, 1000);
    }
  }, [isEditMode, isViewMode, isDataLoaded, productData, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'category') {
        const categoryId = value.category;
        setSelectedCategory(categoryId || '');
        // Reset subcategory when category changes
        if (categoryId !== productData?.categoryId) {
          form.setValue('subCategory', '');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, productData?.categoryId]);

  useEffect(() => {
    if (
      (isEditMode || isViewMode) &&
      selectedCategory === productData?.categoryId &&
      productData?.subcategoryId
    ) {
      form.setValue('subCategory', productData.subcategoryId);
    }
  }, [isEditMode, isViewMode, selectedCategory, productData?.categoryId, productData?.subcategoryId, form]);

  const handleProductImagesChange = async (files: File[]) => {
    if (isViewMode) {
      return;
    }

    // If files array is empty, it means all images were removed
    if (files.length === 0) {
      setUploadedFiles([]);
      setUploadedS3FileNames([]);
      form.setValue('productImages', []);
      return;
    }

    // Immediately set the files for preview
    setUploadedFiles(files);

    try {
      // Upload all files and get S3 filenames - use productimages folder
      const s3FileNames = await uploadMultipleFiles.mutateAsync({ files, folder: 'productimages' });

      setUploadedS3FileNames(s3FileNames);

      // Update form with S3 filenames in the required format
      const productImagesData = s3FileNames.map((s3FileName: string) => ({ productS3Filename: s3FileName }));

      form.setValue('productImages', productImagesData);

      toast.success('Images uploaded successfully!');
    } catch (error: any) {
      console.error('Failed to upload images:', error);
      const errorMessage = error?.message || 'Failed to upload images. Please try again.';
      toast.error(errorMessage);
      // Reset the files
      setUploadedFiles([]);
      setUploadedS3FileNames([]);
      form.setValue('productImages', []);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (isViewMode && !isEditing) {
      return;
    }
    console.log('Form submission data:', data);
    console.log('Product images in form data:', data.productImages);
    console.log('Uploaded S3 filenames state:', uploadedS3FileNames);

    // Ensure productImages is properly set from form state or uploaded files
    const finalProductImages = data.productImages && data.productImages.length > 0
      ? data.productImages
      : uploadedS3FileNames.length > 0
        ? uploadedS3FileNames.map((s3FileName: string) => ({ productS3Filename: s3FileName }))
        : [];

    console.log('Final product images:', finalProductImages);

    try {
      const normalizedUom = data.baseUom?.trim().toLowerCase();
      const selectedUomId =
        (normalizedUom && uomIdByName[normalizedUom]) ||
        (normalizedUom &&
          productData?.unitOfMesaurement?.uomName?.trim().toLowerCase() === normalizedUom
          ? productData.unitOfMesaurement.unitOfMesaurementId
          : undefined);

      const productPayload = {
        productName: data.productName,
        skuCode: data.skuCode,
        description: data.productName,
        hsnCode: data.hsnCode,
        pictureUrl: finalProductImages.length > 0
          ? finalProductImages[0].productS3Filename
          : 'https://example.com/images/brown-rice.jpg',
        isActive: true,
        mrp: data.mrp,
        minimumPrice: data.minimumPrice,
        gstPercentage: data.gstPercentage,
        baseUom: data.baseUom,
        unitPerCase: data.unitPerCase || [],
        brandId: data.brand,
        uom: data.baseUom,
        unitOfMesaurementId: selectedUomId,
        capacity: data.capacity,
        categoryId: data.category,
        subcategoryId: data.subCategory,
        mappings:
          data.warehouse?.map((w: { warehouseId: string }) => ({
            warehouseId: w.warehouseId,
          })) || [],
        productImages: finalProductImages,
      };

      console.log('Product payload:', productPayload);

      if (isEditMode || (isViewMode && isEditing)) {
        toast.loading('Updating product...', { id: 'product-action' });
        await updateProduct.mutateAsync({
          productId: productId!,
          data: productPayload,
        });
        toast.success('Product updated successfully!', {
          id: 'product-action',
        });
        // Reset form dirty state after successful save
        form.reset(form.getValues());
        // Exit edit mode
        setIsEditing(false);
        // Refetch to get latest data
        productQuery.refetch();
      } else {
        toast.loading('Creating product...', { id: 'product-action' });
        await createProduct.mutateAsync(productPayload);
        toast.success('Product created successfully!', {
          id: 'product-action',
        });
        router.push(NavKeys.DashboardProducts);
      }
    } catch (error) {
      toast.error(
        `Failed to ${isEditMode ? 'update' : 'create'} product. Please try again.`,
        {
          id: 'product-action',
        }
      );
    }
  };

  if ((isEditMode || isViewMode) && productQuery.isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Loading product data..." />
      </section>
    );
  }

  if ((isEditMode || isViewMode) && productQuery.error) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading product data. Please try again." />
      </section>
    );
  }

  const isReadOnly = isViewMode && !isEditing;

  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader
        {...breadcrumb}
        actions={
          isViewMode && !isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </Button>
          ) : undefined
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg bg-card p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Basic Information
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="skuCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter SKU code"
                        {...field}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'bg-neutral-100 text-neutral-700' : ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter product name"
                        {...field}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'bg-neutral-100 text-neutral-700' : ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Product Images - positioned in third column, spanning 3 rows */}
              <div className="md:row-span-3">
                <ImageUploadField
                  name="productImages"
                  label="Product Images"
                  multiple
                  maxImages={5}
                  placeholder="Upload product images - Click or drag and drop"
                  onChange={handleProductImagesChange}
                  value={
                    uploadedFiles.length > 0
                      ? uploadedFiles.map((file) => URL.createObjectURL(file))
                      : productData?.productImages?.map((img: any) => getCloudFrontUrl(img.productS3Filename || img.s3Filename)) || []
                  }
                  disabled={uploadMultipleFiles.isPending || isReadOnly}
                />
              </div>

              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter MRP"
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'bg-neutral-100 text-neutral-700' : ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Price</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter minimum price"
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Percentage</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter GST percentage"
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'bg-neutral-100 text-neutral-700' : ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hsnCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter HSN code"
                        {...field}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'bg-neutral-100 text-neutral-700' : ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Product Classification */}
          <div className="rounded-lg bg-card p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Product Classification
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <MasterRecordSelect
                        masterName="brand"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select brand"
                        className="w-full"
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <MasterRecordSelect
                        masterName="category"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select category"
                        className="w-full"
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subCategory"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Sub Category</FormLabel>
                    <FormControl>
                      <div
                        className={
                          !selectedCategory
                            ? 'pointer-events-none opacity-50 w-full'
                            : 'w-full'
                        }
                      >
                        <MasterRecordSelect
                          masterName="subcategory"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={
                            selectedCategory
                              ? 'Select sub category'
                              : 'Select category first'
                          }
                          filters={
                            selectedCategory
                              ? { categoryId: selectedCategory }
                              : undefined
                          }
                          className="w-full"
                          disabled={isReadOnly}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Physical Properties */}
          <div className="rounded-lg bg-card p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Physical Properties
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Enter capacity"
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={isReadOnly}
                          className={isReadOnly ? 'bg-neutral-100 text-neutral-700 pr-12' : 'pr-12'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                          /kg
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormSelect
                control={form.control}
                name="baseUom"
                label="Base UOM"
                placeholder="Select Base UOM"
                options={uomOptions}
                disabled={isReadOnly}
              />

              <FormItem>
                <FormLabel>UOM</FormLabel>
                <FormControl>
                  <Input
                    value={sizeUom || 'kilogram (kg)'}
                    readOnly
                    disabled
                    className="bg-neutral-100 text-neutral-700 cursor-not-allowed"
                  />
                </FormControl>
              </FormItem>
            </div>

            {/* Unit Per Case Section */}
            {(form.watch('unitPerCase')?.length ?? 0) > 0 && (
              <div className="mt-6">
                <FormLabel className="mb-4 block text-sm font-medium">
                  Unit Per Case
                </FormLabel>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {form.watch('unitPerCase')?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                            {item.numerator}
                          </span>
                          <span className="text-sm font-medium text-neutral-700">
                            {item.buom}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-neutral-400">=</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-secondary/10 px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
                            {item.denominator}
                          </span>
                          <span className="text-sm font-medium text-neutral-700">
                            {item.auom}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-2">
              {isViewMode && isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (productData) {
                      productQuery.refetch();
                    }
                  }}
                >
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="outline" asChild>
                  <Link href={NavKeys.DashboardProducts}>Cancel</Link>
                </Button>
              )}
              <Button
                type="submit"
                className="flex items-center gap-2"
                disabled={
                  createProduct.isPending ||
                  updateProduct.isPending ||
                  uploadMultipleFiles.isPending
                }

              >
                {isEditMode || (isViewMode && isEditing)
                  ? updateProduct.isPending
                    ? 'Updating...'
                    : 'Update Product'
                  : createProduct.isPending
                    ? 'Creating...'
                    : 'Create Product'}
                {uploadMultipleFiles.isPending && ' (Uploading Images...)'}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </section>
  );
};

export default ProductCreatePage;
