import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, ImagePlus, Trash2, X } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useDeleteResource } from "@/hooks/useAdminMutations";
import {
  createAdminResource,
  createAdminResourceMultipart,
  deleteAdminResource,
  fetchAdminResourceDetail,
  fetchAdminStats,
  publicMediaUrl,
  updateAdminResource,
} from "@/lib/api";

interface ProductImageRow {
  id: string;
  image: string | null;
  is_primary: boolean;
  order: number;
}

interface ProductRow {
  id: string;
  name: string;
  vendor_id: string;
  vendor_name: string;
  category_id: string;
  category_name: string;
  description: string;
  price: string;
  discounted_price: string;
  stock: number;
  sku: string;
  is_active: boolean;
  avg_rating: number;
  created_at: string;
  primary_image?: string | null;
}

const emptyProduct: Omit<ProductRow, "id" | "avg_rating" | "created_at"> = {
  name: "",
  vendor_id: "",
  vendor_name: "",
  category_id: "",
  category_name: "",
  description: "",
  price: "",
  discounted_price: "",
  stock: 0,
  sku: "",
  is_active: true,
};

const advFilterFields: FilterField[] = [
  { key: "is_active", label: "Active only", type: "boolean" },
  { key: "stock", label: "Min stock", type: "number" },
];

export default function ProductsAdmin() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const { data } = useAdminResource<any>("products", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "products"],
    queryFn: () => fetchAdminStats("products"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const deleteMutation = useDeleteResource("products");
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProductRow> & typeof emptyProduct>(emptyProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImageRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const mainPreviewUrl = useMemo(
    () => (mainImageFile ? URL.createObjectURL(mainImageFile) : null),
    [mainImageFile],
  );
  const galleryPreviewUrls = useMemo(
    () => galleryFiles.map((f) => URL.createObjectURL(f)),
    [galleryFiles],
  );

  useEffect(() => {
    return () => {
      if (mainPreviewUrl) URL.revokeObjectURL(mainPreviewUrl);
    };
  }, [mainPreviewUrl]);
  useEffect(() => {
    return () => {
      galleryPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [galleryPreviewUrls]);

  const { coverImage, galleryExisting } = useMemo(() => {
    const sorted = [...existingImages].sort((a, b) => a.order - b.order);
    const cover = sorted.find((i) => i.is_primary) ?? sorted[0];
    const gallery = cover ? sorted.filter((i) => i.id !== cover.id) : [];
    return { coverImage: cover ?? null, galleryExisting: gallery };
  }, [existingImages]);

  useEffect(() => {
    if (!formOpen || !isEditing || !(editing as ProductRow).id) {
      setExistingImages([]);
      setDetailLoading(false);
      return;
    }
    const id = (editing as ProductRow).id;
    let cancelled = false;
    setDetailLoading(true);
    fetchAdminResourceDetail<{
      product_images?: ProductImageRow[];
    }>("products", id)
      .then((detail) => {
        if (cancelled) return;
        setExistingImages(
          (detail.product_images || []).map((im) => ({
            id: im.id,
            image: im.image ?? null,
            is_primary: Boolean(im.is_primary),
            order: Number(im.order ?? 0),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load product images");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formOpen, isEditing, isEditing ? (editing as ProductRow).id : undefined]);

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((p: any) => ({
        id: p.id,
        name: p.name || "",
        vendor_id: p.vendor || "",
        vendor_name: p.vendor_store_name || "",
        category_id: p.category || "",
        category_name: p.category_name || "",
        description: p.description || "",
        price: p.price != null ? String(p.price) : "",
        discounted_price: p.discounted_price != null ? String(p.discounted_price) : "",
        stock: Number(p.stock ?? 0),
        sku: p.sku || "",
        is_active: p.is_active !== false,
        avg_rating: Number(p.avg_rating || 0),
        created_at: p.created_at ? String(p.created_at).slice(0, 10) : "",
        primary_image: p.primary_image ?? null,
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((p) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.vendor_name.toLowerCase().includes(q))
        return false;
    }
    if (activeStatus === "active" && !p.is_active) return false;
    if (activeStatus === "inactive" && p.is_active) return false;
    if (advFilters.is_active && !p.is_active) return false;
    if (advFilters.stock !== "" && advFilters.stock != null && p.stock < Number(advFilters.stock)) return false;
    return true;
  });

  const uploadNewImages = async (productId: string) => {
    if (mainImageFile) {
      const fd = new FormData();
      fd.append("product", productId);
      fd.append("image", mainImageFile);
      fd.append("is_primary", "true");
      fd.append("order", "0");
      await createAdminResourceMultipart("product_images", fd);
    }
    const maxOrder = Math.max(0, ...existingImages.map((i) => i.order));
    let order = mainImageFile ? Math.max(maxOrder, 0) : maxOrder;
    for (const file of galleryFiles) {
      order += 1;
      const fd = new FormData();
      fd.append("product", productId);
      fd.append("image", file);
      fd.append("is_primary", "false");
      fd.append("order", String(order));
      await createAdminResourceMultipart("product_images", fd);
    }
  };

  const handleSave = async () => {
    if (!editing.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editing.vendor_id) {
      toast.error("Vendor is required");
      return;
    }
    if (!editing.category_id) {
      toast.error("Category is required");
      return;
    }
    const { vendor_name, category_name, avg_rating, created_at, primary_image, ...rest } = editing as any;
    const payload: Record<string, any> = {
      vendor: rest.vendor_id,
      category: rest.category_id,
      name: rest.name,
      description: rest.description || "",
      price: rest.price ? parseFloat(rest.price) : 0,
      discounted_price: rest.discounted_price ? parseFloat(rest.discounted_price) : null,
      stock: Number(rest.stock) || 0,
      sku: rest.sku || "",
      is_active: Boolean(rest.is_active),
    };
    try {
      if (isEditing && (editing as ProductRow).id) {
        const pid = (editing as ProductRow).id;
        await updateAdminResource("products", pid, payload);
        await uploadNewImages(pid);
        toast.success("Product updated");
      } else {
        const created = await createAdminResource<{ id: string }>("products", payload);
        if (created?.id) await uploadNewImages(created.id);
        toast.success("Product created");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", "products"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats", "products"] });
      setFormOpen(false);
      setMainImageFile(null);
      setGalleryFiles([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const removeExistingImage = async (img: ProductImageRow) => {
    try {
      await deleteAdminResource("product_images", img.id);
      setExistingImages((prev) => prev.filter((x) => x.id !== img.id));
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", "products"] });
      toast.success("Image removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => {
          toast.success("Deleted");
          setDeleteOpen(false);
          setDeleteTarget(null);
          if (selected?.id === deleteTarget.id) {
            setDrawerOpen(false);
            setSelected(null);
          }
        },
      });
    }
  };

  return (
    <>
      <ModulePage
        title="Products"
        subtitle="Browse and manage products"
        createLabel="Add Product"
        onCreate={() => {
          setEditing({ ...emptyProduct });
          setIsEditing(false);
          setMainImageFile(null);
          setGalleryFiles([]);
          setExistingImages([]);
          setFormOpen(true);
        }}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "Active", value: statsData?.bool_counts.is_active ?? rows.filter((p) => p.is_active).length },
          {
            label: "In stock",
            value: statsData?.out_of_stock != null ? statsData.total - statsData.out_of_stock : rows.filter((p) => p.stock > 0).length,
          },
          { label: "Out of stock", value: statsData?.out_of_stock ?? rows.filter((p) => p.stock === 0).length },
          { label: "Avg price", value: statsData?.avg_amount != null ? `Rs. ${statsData.avg_amount}` : "—" },
          { label: "New today", value: statsData?.today ?? 0 },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search name, SKU, vendor…"
        columns={[
          { key: "name", label: "Product", render: (r: ProductRow) => <span className="font-medium">{r.name}</span> },
          { key: "vendor_name", label: "Vendor" },
          { key: "category_name", label: "Category" },
          { key: "price", label: "Price", render: (r: ProductRow) => <span className="font-mono text-xs">Rs. {r.price}</span> },
          { key: "stock", label: "Stock", render: (r: ProductRow) => <span className="font-mono">{r.stock}</span> },
          { key: "is_active", label: "Active", render: (r: ProductRow) => <StatusBadge status={r.is_active ? "online" : "offline"} /> },
        ]}
        data={filtered}
        advancedFilterFields={advFilterFields}
        advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters}
        onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || ""} subtitle={selected?.id}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing({ ...selected });
                  setIsEditing(true);
                  setMainImageFile(null);
                  setGalleryFiles([]);
                  setExistingImages([]);
                  setFormOpen(true);
                  setDrawerOpen(false);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["Vendor", selected.vendor_name],
                  ["Category", selected.category_name],
                  ["Price", `Rs. ${selected.price}`],
                  ["Discounted", selected.discounted_price ? `Rs. ${selected.discounted_price}` : "—"],
                  ["Stock", String(selected.stock)],
                  ["SKU", selected.sku],
                  ["Active", selected.is_active ? "Yes" : "No"],
                  ["Rating", selected.avg_rating.toFixed(1)],
                  ["Description", selected.description],
                  ["Created", selected.created_at],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span>
                  <p className="text-sm font-medium">{v || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setMainImageFile(null);
            setGalleryFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <EntitySearchField
              resource="vendors"
              labelKey="store_name"
              secondaryKey="user_full_name"
              value={editing.vendor_id || ""}
              displayName={editing.vendor_name || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, vendor_id: id, vendor_name: label }))}
              label="Vendor"
              required
            />
            <EntitySearchField
              resource="product_categories"
              labelKey="name"
              value={editing.category_id || ""}
              displayName={editing.category_name || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, category_id: id, category_name: label }))}
              label="Category"
              required
            />
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input value={editing.name} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-sm font-medium">Main image</Label>
              <p className="text-xs text-muted-foreground">Primary photo for listings and product detail.</p>
              {isEditing && detailLoading ? (
                <p className="text-xs text-muted-foreground">Loading current images…</p>
              ) : null}
              {mainPreviewUrl ? (
                <div className="relative inline-block">
                  <img src={mainPreviewUrl} alt="" className="h-28 w-28 rounded-md border object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full shadow"
                    onClick={() => setMainImageFile(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <span className="mt-1 block text-[11px] text-muted-foreground">New primary (saved on submit)</span>
                </div>
              ) : (
                (() => {
                  const curUrl = coverImage?.image ? publicMediaUrl(coverImage.image) : null;
                  if (isEditing && curUrl && coverImage) {
                    return (
                      <div className="space-y-2">
                        <div className="relative inline-block">
                          <img src={curUrl} alt="" className="h-28 w-28 rounded-md border object-cover" />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -right-2 -top-2 h-7 w-7 rounded-full shadow"
                            onClick={() => removeExistingImage(coverImage)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
                          Replace main image
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              setMainImageFile(f ?? null);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    );
                  }
                  return (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed py-6 text-sm text-muted-foreground hover:bg-muted/40">
                      <ImagePlus className="h-6 w-6" />
                      <span>Choose main image</span>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setMainImageFile(f ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  );
                })()
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-sm font-medium">More images</Label>
              <p className="text-xs text-muted-foreground">Optional gallery — select several files at once.</p>
              <div className="flex flex-wrap gap-2">
                {galleryExisting.map((im) => {
                    const url = im.image ? publicMediaUrl(im.image) : null;
                    if (!url) return null;
                    return (
                      <div key={im.id} className="relative">
                        <img src={url} alt="" className="h-16 w-16 rounded border object-cover" />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute -right-1 -top-1 h-5 w-5 rounded-full"
                          onClick={() => removeExistingImage(im)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                {galleryPreviewUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative">
                    <img src={url} alt="" className="h-16 w-16 rounded border object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full"
                      onClick={() => setGalleryFiles((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                <ImagePlus className="h-4 w-4" />
                Add gallery images
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (!list?.length) return;
                    setGalleryFiles((prev) => [...prev, ...Array.from(list)]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Price (Rs) *</Label>
                <Input type="number" value={editing.price} onChange={(e) => setEditing((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Discounted (Rs)</Label>
                <Input type="number" value={editing.discounted_price} onChange={(e) => setEditing((p) => ({ ...p, discounted_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Stock *</Label>
                <Input type="number" value={editing.stock} onChange={(e) => setEditing((p) => ({ ...p, stock: parseInt(e.target.value, 10) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">SKU</Label>
                <Input value={editing.sku} onChange={(e) => setEditing((p) => ({ ...p, sku: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border col-span-2">
                <Label>Active</Label>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing((p) => ({ ...p, is_active: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete product"
        description={`Delete "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
