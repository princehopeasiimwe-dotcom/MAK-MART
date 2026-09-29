import { useRef, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { uploadImage } from "../../lib/imageUpload";
import useAuth from "../../hooks/useAuth";

function ImageUploadField({
  bucket,
  value,
  onChange,
  label = "Image",
}) {
  const { user } = useAuth();
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const url = await uploadImage(bucket, file, user?.id);
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      // allow re-selecting the same file name later
      event.target.value = "";
    }
  };

  return (
    <div className="form-group">
      <label>{label}</label>

      {value ? (
        <div className="image-upload-preview">
          <img src={value} alt="Preview" />
          <button
            type="button"
            className="image-upload-preview__remove"
            onClick={() => onChange("")}
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="image-upload-dropzone"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud size={20} />
              Click to upload an image
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export default ImageUploadField;