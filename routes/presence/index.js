import { Router } from "express";
import {confirmPresence, getAllPresencesFromChamada} from "../../controllers/presenceController.js";

const router = Router();

router.get("/:chamadaId", getAllPresencesFromChamada);
router.post("/:chamadaId", confirmPresence);

export default router;