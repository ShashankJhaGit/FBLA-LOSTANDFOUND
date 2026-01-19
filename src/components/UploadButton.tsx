import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

interface UploadButtonProps {
	onUploadComplete: (url: string) => void;
	buttonText?: string;
}

export function UploadButton({ onUploadComplete, buttonText = "Upload" }: UploadButtonProps) {
	const [isUploading, setIsUploading] = useState(false);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Upload failed");
			}

			const data = await response.json();
			onUploadComplete(data.url || URL.createObjectURL(file));
		} catch (error) {
			console.error("Upload error:", error);
			onUploadComplete(URL.createObjectURL(file));
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<Input
				id="file-upload"
				type="file"
				accept="image/*"
				onChange={handleFileChange}
				disabled={isUploading}
				className="hidden"
			/>
			<Button
				type="button"
				variant="outline"
				onClick={() => document.getElementById("file-upload")?.click()}
				disabled={isUploading}
			>
				<Upload className="mr-2 h-4 w-4" />
				{isUploading ? "Uploading..." : buttonText}
			</Button>
		</div>
	);
}
