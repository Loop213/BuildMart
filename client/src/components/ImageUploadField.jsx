import { useId, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { uploadToCloudinary } from "../utils/cloudinary";

export function ImageUploadField({
  label,
  value,
  onChange,
  placeholder,
  folder = "buildmart",
  previewClassName = "h-28 w-full rounded-2xl object-cover"
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, folder);
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(error.message || "Unable to upload image");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="input-field flex-1"
        />
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-brand-500"
        >
          {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {uploading ? "Uploading..." : "Upload"}
        </label>
        <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      {value ? (
        <img src={value} alt={label} className={previewClassName} />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
          No image selected
        </div>
      )}
    </div>
  );
}
