import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import gmailRouter from "./gmail";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);
router.use(gmailRouter);

export default router;
