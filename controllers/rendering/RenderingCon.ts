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
  const startTime = Date.now();
  
  console.log("\n🎬 RENDER STARTED:", compositionId);

  let mp4Path: string | undefined;
  let finalPath: string | undefined;

  try {
    // Bundle
    console.log("📦 Bundling...");
    const bundleLocation = await bundle({
      entryPoint: path.resolve(entry),
      webpackOverride: (config) => config,
    });
    console.log("✅ Bundle complete");

    // Select composition
    console.log("🔍 Selecting composition...");
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
      timeoutInMilliseconds: 60000,
    });
    console.log(`✅ Composition: ${composition.width}x${composition.height}, ${composition.durationInFrames}f @ ${composition.fps}fps`);

    // Setup paths
    const tmpBaseName = `${compositionId}-${Date.now()}`;
    mp4Path = path.join(os.tmpdir(), `${tmpBaseName}.mp4`);

    // Render with optimizations
    console.log("🎬 Rendering...");
    await renderMedia({
      serveUrl: bundleLocation,
      composition,
      codec: "h264",
      outputLocation: mp4Path,
      inputProps,
      concurrency: 1,
      
      // ⚡ SPEED OPTIMIZATIONS
      videoBitrate: "1500k",
      encodingMaxRate: "2000k",
      encodingBufferSize: "2000k",
      pixelFormat: "yuv420p",
      timeoutInMilliseconds: 180000,
      
      // Simple progress logging
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100);
        if (percent % 10 === 0) {
          console.log(`🎬 Progress: ${percent}%`);
        }
      },
    });

    console.log("✅ Render complete!");

    // Verify file
    if (!fs.existsSync(mp4Path)) {
      throw new Error("Output file not found");
    }
    
    const fileSize = fs.statSync(mp4Path).size;
    console.log(`📁 Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    // Convert if needed
    finalPath = mp4Path;
    let finalFormat = "mp4";

    if (format === "gif" || format === "webm") {
      console.log(`🎞️ Converting to ${format}...`);
      finalPath = await convertVideo(mp4Path, format);
      finalFormat = format;
      console.log(`✅ Converted`);
    }

    // Upload to Cloudinary
    console.log("☁️ Uploading...");
    const resourceType = finalFormat === "gif" ? "image" : "video";

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Upload timeout"));
      }, 60000);
      
      cloudinary.uploader.upload(
        finalPath!,
        {
          resource_type: resourceType,
          folder: "remotion_renders",
          public_id: tmpBaseName,
          format: finalFormat,
        },
        (error, result) => {
          clearTimeout(timeout);
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    console.log("✅ Upload complete!");

    // Cleanup
    setTimeout(() => {
      [mp4Path, finalPath].forEach(file => {
        try {
          if (file && file !== mp4Path && fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch (err) {
          console.warn("Cleanup warning:", err);
        }
      });
      
      try {
        if (mp4Path && fs.existsSync(mp4Path)) {
          fs.unlinkSync(mp4Path);
        }
      } catch (err) {
        console.warn("Cleanup warning:", err);
      }
    }, 3000);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ COMPLETED in ${duration}s\n`);

    return res.json({
      success: true,
      url: uploadResult.secure_url,
      format: finalFormat,
      duration: `${duration}s`,
    });

  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ FAILED after ${duration}s:`, error.message);

    // Cleanup on error
    [mp4Path, finalPath].forEach(file => {
      try {
        if (file && fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {}
    });

    // Determine error type
    let statusCode = 500;
    let userMessage = "Video rendering failed";
    
    if (error.message?.includes('timeout')) {
      statusCode = 504;
      userMessage = "Rendering timed out. Try a shorter video (3-5 seconds).";
    } else if (error.message?.includes('memory')) {
      statusCode = 503;
      userMessage = "Server out of memory. Try again later.";
    }

    res.status(statusCode).json({
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      duration: `${duration}s`,
    });
  }
};