import express from "express";
import airoutes from "./routes/apis/gemini.ts";
import renderingroutes from "./routes/rendering.ts";
import uploadroutes from "./routes/uploads.ts";
import elevenlabsroutes from "./routes/apis/elevenlabs.ts";
import redditroute from "./routes/apis/reddit.ts";
import authroutes from "./routes/database/auth.ts";
import projectsroutes from "./routes/database/projects.ts";
import uploadindbroutes from "./routes/database/useruploads.ts";
import pixabayroutes from "./routes/apis/pixabay.ts";
import rendersroutes from "./routes/database/renders.ts";
import datasetsdbupload from "./routes/database/datasetsupload.ts";
import getDatasetFronUploadsroute from "./routes/apis/fromuploadsextraction.ts";
import GoogleRoutes from './routes/google.ts';
import cors from "cors";
import fs from "fs";
import { distentry, entry, entry2 } from "./controllers/entrypoint.ts";
import session from 'express-session';
import passport from 'passport';

const app = express();

// ✅ Enhanced CORS configuration - MUST be before routes
app.use(cors({ 
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ✅ Increase payload limits for video rendering
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Increase timeout for video rendering endpoints (10 minutes)
app.use('/generatevideo', (req, res, next) => {
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000);
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.set("trust proxy", true);

// Routes
app.use("/api", airoutes);
app.use("/generatevideo", renderingroutes);
app.use("/uploadhandler", uploadroutes);
app.use("/useruploads", uploadindbroutes);
app.use("/sound", elevenlabsroutes);
app.use("/reddit", redditroute);
app.use("/auth", authroutes);
app.use("/projects", projectsroutes);
app.use("/pixabay", pixabayroutes);
app.use("/renders", rendersroutes);
app.use("/datasets", datasetsdbupload);
app.use("/fromuploadsdataset", getDatasetFronUploadsroute);
app.use("/authenticate", GoogleRoutes);

// ✅ Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global Error Handler:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log("entry 1: ", fs.existsSync(entry));
  console.log("entry 2: ", fs.existsSync(entry2));
  console.log("disentry: ", fs.existsSync(distentry));
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});