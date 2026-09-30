import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import gmailRouter from "./gmail";
import gmailAnalysisRouter from "./gmail-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);
router.use(gmailRouter);
router.use(gmailAnalysisRouter);

export default router;
