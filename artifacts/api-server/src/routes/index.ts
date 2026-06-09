import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sitemapRouter from "./sitemap";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import cartRouter from "./cart";
import reviewsRouter from "./reviews";
import wishlistRouter from "./wishlist";
import couponsRouter from "./coupons";
import bannersRouter from "./banners";
import notificationsRouter from "./notifications";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sitemapRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(cartRouter);
router.use(reviewsRouter);
router.use(wishlistRouter);
router.use(couponsRouter);
router.use(bannersRouter);
router.use(notificationsRouter);
router.use(analyticsRouter);

export default router;
