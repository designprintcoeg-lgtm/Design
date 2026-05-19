import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import customersRouter from "./customers";
import quotationsRouter from "./quotations";
import salesOrdersRouter from "./salesOrders";
import jobOrdersRouter from "./jobOrders";
import jobStagesRouter from "./jobStages";
import machinesRouter from "./machines";
import materialsRouter from "./materials";
import costingRouter from "./costing";
import qcRouter from "./qc";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(customersRouter);
router.use(quotationsRouter);
router.use(salesOrdersRouter);
router.use(jobOrdersRouter);
router.use(jobStagesRouter);
router.use(machinesRouter);
router.use(materialsRouter);
router.use(costingRouter);
router.use(qcRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
