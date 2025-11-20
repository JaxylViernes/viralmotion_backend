import path from "path";
import os from "os";
import fs from "fs";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { bundle } from "@remotion/bundler";
import type { Request, Response } from "express";
import cloudinary from "../../utils/cloudinaryClient.ts";
import { convertVideo } from "../../utils/ffmpeg.ts";
import { entry } from "../entrypoint.ts";

// ✅ Helper function to check system resources
const checkSystemResources = () => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const freeMemGB = (freeMem / 1024 / 1024 / 1024).toFixed(2);
  const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
  const usedPercent = ((1 - freeMem / totalMem) * 100).toFixed(1);
  
  console.log(`💾 Memory: ${freeMemGB}GB free / ${totalMemGB}GB total (${usedPercent}% used)`);
  
  // More lenient check: warn at 200MB, only block in production at 100MB
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const minMemory = isDevelopment ? 100 * 1024 * 1024 : 200 * 1024 * 1024; // 100MB dev, 200MB prod
  
  if (freeMem < minMemory) {
    const warning = `⚠️ LOW MEMORY WARNING: Less than ${isDevelopment ? '100MB' : '200MB'} available`;
    console.warn(warning);
    return isDevelopment; // Allow in dev, block in prod
  }
  return true;
};

// ✅ Cleanup function
const cleanupFiles = (files: string[]) => {
  files.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️ Cleaned up: ${file}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete ${file}:`, err);
    }
  });
};

export const handleExport = async (req: Request, res: Response) => {
  const { inputProps, format, compositionId } = req.body;
  
  const startTime = Date.now();
  let bundleLocation: string | undefined;
  let mp4Path: string | undefined;
  let finalPath: string | undefined;

  console.log("\n" + "=".repeat(60));
  console.log("🎬 RENDER REQUEST STARTED");
  console.log("=".repeat(60));
  console.log("📊 Props:", JSON.stringify(inputProps, null, 2));
  console.log("📦 Format:", format);
  console.log("🎯 Composition ID:", compositionId);
  console.log("⏰ Time:", new Date().toISOString());
  
  // Check system resources
  const hasEnoughMemory = checkSystemResources();
  if (!hasEnoughMemory && process.env.NODE_ENV === 'production') {
    console.error("❌ Insufficient memory to render video");
    return res.status(503).json({ 
      error: "Insufficient server resources",
      message: "Not enough memory available to render video. Please try again later."
    });
  }

  try {
    // ✅ 1. Validate entry file
    if (!fs.existsSync(entry)) {
      console.error("❌ Entry file not found:", entry);
      return res.status(404).json({ 
        error: "Remotion entry file not found",
        path: entry 
      });
    }
    console.log("✅ Entry file exists:", entry);

    // ✅ 2. Bundle
    console.log("📦 Starting bundle...");
    bundleLocation = await bundle({
      entryPoint: path.resolve(entry),
      webpackOverride: (config) => config,
    });
    console.log("✅ Bundle complete:", bundleLocation);

    // Check memory after bundle
    checkSystemResources();

    // ✅ 3. Select composition
    console.log("🔍 Selecting composition...");
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
      timeoutInMilliseconds: 90000, // 90 seconds timeout for composition selection
    });

    console.log("✅ Composition selected:", composition.id);
    console.log(`📐 Resolution: ${composition.width}x${composition.height}`);
    console.log(`⏱️ Duration: ${composition.durationInFrames} frames @ ${composition.fps}fps`);

    // ✅ 4. Setup output paths
    const tmpBaseName = `${compositionId}-${Date.now()}`;
    const tmpDir = os.tmpdir();
    mp4Path = path.join(tmpDir, `${tmpBaseName}.mp4`);

    console.log("🎬 Rendering video to:", mp4Path);

    // Check memory before rendering
    checkSystemResources();

    // ✅ 5. Render MP4
    await renderMedia({
      serveUrl: bundleLocation,
      composition,
      codec: "h264",
      outputLocation: mp4Path,
      inputProps,
      concurrency: 1, // Low concurrency for limited resources
      timeoutInMilliseconds: 300000, // 5 minutes timeout
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const percent = Math.round(progress * 100);
        if (percent % 10 === 0) { // Log every 10%
          console.log(`🎬 Rendering: ${percent}% (${renderedFrames}/${composition.durationInFrames} frames)`);
        }
      },
    });

    console.log("✅ Render complete!");
    
    // Check if file was created
    if (!fs.existsSync(mp4Path)) {
      throw new Error("Render completed but output file not found");
    }
    
    const fileSize = fs.statSync(mp4Path).size;
    console.log(`📁 File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    // ✅ 6. Convert if needed
    finalPath = mp4Path;
    let finalFormat = "mp4";

    if (format === "gif" || format === "webm") {
      console.log(`🎞️ Converting to ${format}...`);
      finalPath = await convertVideo(mp4Path, format);
      finalFormat = format;
      
      if (!fs.existsSync(finalPath)) {
        throw new Error(`Conversion completed but ${format} file not found`);
      }
      
      const convertedSize = fs.statSync(finalPath).size;
      console.log(`✅ Converted to ${format}: ${(convertedSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // ✅ 7. Upload to Cloudinary
    console.log("☁️ Uploading to Cloudinary...");
    const resourceType = finalFormat === "gif" ? "image" : "video";

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Cloudinary upload timeout"));
      }, 120000); // 2 minutes timeout

      cloudinary.uploader.upload(
        finalPath,
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

    console.log("☁️ Upload successful:", uploadResult.secure_url);

    // ✅ 8. Cleanup temp files
    const filesToCleanup = [mp4Path];
    if (finalPath !== mp4Path) {
      filesToCleanup.push(finalPath);
    }
    
    // Cleanup after a delay
    setTimeout(() => cleanupFiles(filesToCleanup), 3000);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log(`✅ RENDER COMPLETED SUCCESSFULLY in ${duration}s`);
    console.log("=".repeat(60) + "\n");

    // ✅ 9. Send response
    return res.json({
      success: true,
      url: uploadResult.secure_url,
      format: finalFormat,
      duration: `${duration}s`,
      size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`
    });

  } catch (error: any) {
    // ✅ Detailed error handling
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error("\n" + "=".repeat(60));
    console.error("❌❌❌ RENDER FAILED ❌❌❌");
    console.error("=".repeat(60));
    console.error("⏱️ Failed after:", `${duration}s`);
    console.error("📝 Error message:", error.message);
    console.error("🔍 Error stack:", error.stack);
    
    // Check if it's a specific error type
    if (error.message?.includes('timeout')) {
      console.error("⏰ TIMEOUT ERROR - Rendering took too long");
    }
    if (error.message?.includes('memory')) {
      console.error("💾 MEMORY ERROR - Out of memory");
    }
    if (error.message?.includes('Chrome')) {
      console.error("🌐 BROWSER ERROR - Chrome Headless Shell issue");
    }
    
    checkSystemResources();
    console.error("=".repeat(60) + "\n");

    // Cleanup temp files on error
    const filesToCleanup = [];
    if (mp4Path && fs.existsSync(mp4Path)) filesToCleanup.push(mp4Path);
    if (finalPath && finalPath !== mp4Path && fs.existsSync(finalPath)) {
      filesToCleanup.push(finalPath);
    }
    cleanupFiles(filesToCleanup);

    // Send appropriate error response
    const statusCode = error.message?.includes('timeout') ? 504 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      error: "Error rendering video",
      message: error.message,
      details: error.toString(),
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });
  }
};