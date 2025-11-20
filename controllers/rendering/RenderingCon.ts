import path from "path";
import os from "os";
import fs from "fs";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { bundle } from "@remotion/bundler";
import type { Request, Response } from "express";
import cloudinary from "../../utils/cloudinaryClient.ts";
import { convertVideo } from "../../utils/ffmpeg.ts";
import { entry } from "../entrypoint.ts";

export const handleExport = async (req: Request, res: Response) => {
  const { inputProps, format, compositionId } = req.body;

  console.log("Receive Props: ", inputProps);
  console.log("Format:", format);
  console.log("Composition ID:", compositionId);

  try {
    // Check if entry file exists
    if (!fs.existsSync(entry)) {
      console.error("❌ Entry file not found:", entry);
      return res.status(404).json({ error: "Remotion entry file not found" });
    }

    console.log("✅ Entry file exists:", entry);
    console.log("📦 Starting bundle...");

    const bundleLocation = await bundle({
      entryPoint: path.resolve(entry),
      webpackOverride: (config) => config,
    });

    console.log("✅ Bundle complete:", bundleLocation);
    console.log("🔍 Selecting composition...");

    // 🔧 FIX: Let Remotion download and use Chrome Headless Shell automatically
    // Do NOT specify browserExecutable - it will use the correct Chrome Headless Shell
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      onBrowserDownload: () => {
        console.log("📥 Downloading Chrome Headless Shell...");
        return {
          version: '2024-11-20',
          onProgress: ({ percent }) => {
            console.log(`📥 Download progress: ${Math.round(percent * 100)}%`);
          },
        };
      },
      inputProps,
    });

    console.log("✅ Composition selected:", composition.id);

    const tmpBaseName = `${compositionId}-${Date.now()}`;
    const tmpDir = os.tmpdir();
    const mp4Path = path.join(tmpDir, `${tmpBaseName}.mp4`);

    console.log("🎬 Rendering video to:", mp4Path);

    // 🧠 4. Render MP4 using Remotion
    await renderMedia({
      serveUrl: bundleLocation,
      composition,
      codec: "h264",
      outputLocation: mp4Path,
      inputProps,
      concurrency: 1,
      // Let Remotion use Chrome Headless Shell - no browserExecutable needed
    });

    console.log("✅ Render complete.");

    // 🌀 5. Convert using FFmpeg if needed
    let finalPath = mp4Path;
    let finalFormat = "mp4";

    if (format === "gif" || format === "webm") {
      console.log(`🎞 Converting to ${format}...`);
      finalPath = await convertVideo(mp4Path, format);
      finalFormat = format;
      console.log(`✅ Converted to ${format}:`, finalPath);
    }

    console.log("☁️ Uploading to Cloudinary...");

    const resourceType = finalFormat === "gif" ? "image" : "video";

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(
        finalPath,
        {
          resource_type: resourceType,
          folder: "remotion_renders",
          public_id: tmpBaseName,
          format: finalFormat,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    setTimeout(() => {
      [mp4Path, finalPath].forEach((file) => {
        fs.unlink(file, (err) => {
          if (err) console.warn("⚠️ Failed to delete temp file:", err);
        });
      });
    }, 3000);

    console.log("☁️ Uploaded successfully:", uploadResult.secure_url);

    // ✅ 8. Send response
    return res.json({
      url: uploadResult.secure_url,
      format: finalFormat,
    });
  } catch (error: any) {
    // 🔴 DETAILED ERROR LOGGING
    console.error("❌❌❌ RENDER ERROR ❌❌❌");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({ 
      message: "Error rendering video", 
      error: error.message,
      details: error.toString()
    });
  }
};