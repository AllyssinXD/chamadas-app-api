import { Router } from "express";
import chamadasRouter from "./chamada/index.js" 
import presenceRouter from "./presence/index.js" 
import authRouter from "./auth/index.js" 
const router = Router();

router.use('/chamada', chamadasRouter)
router.use('/presence', presenceRouter)
router.use('/auth', authRouter)

export default router;