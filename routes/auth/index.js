import { Router } from "express";
import { getAdmin, login } from "../../controllers/authController.js";
import auth from "../../middlewares/auth.js";

const router = Router();

router.get('/', auth, getAdmin)
router.post('/login', login)

export default router;