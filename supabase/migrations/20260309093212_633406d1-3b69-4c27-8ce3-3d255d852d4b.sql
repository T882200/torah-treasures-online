-- Wire up the check_low_stock trigger on products
CREATE TRIGGER trg_check_low_stock
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_low_stock();

-- Wire up the update_product_rating_stats trigger on product_reviews
CREATE TRIGGER trg_update_product_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating_stats();