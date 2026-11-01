-- Coupon preview must use the same actual offer price as payment order reservation.
create or replace function public.aeromind_coupon_preview(p_code text,p_slug text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.aeromind_coupons%rowtype; v_price integer; v_usage integer;
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória' using errcode='42501'; end if;
 select case when flash_price_cents is not null and flash_ends_at>now()
             then flash_price_cents else price_cents end into v_price
 from public.aeromind_plan_catalog
 where slug=p_slug and visible=true and price_cents>200;
 if not found then return jsonb_build_object('valid',false); end if;
 select * into c from public.aeromind_coupons
 where code=upper(trim(p_code)) and active=true and (expires_at is null or expires_at>now());
 if not found then return jsonb_build_object('valid',false); end if;
 select count(*) into v_usage from public.aeromind_coupon_orders co
 join public.aeromind_payment_orders o on o.id=co.order_id
 where co.coupon_code=c.code and (o.status='paid' or
  (o.status in ('created','pending') and o.created_at>now()-interval '30 minutes'));
 if c.max_uses is not null and v_usage>=c.max_uses then return jsonb_build_object('valid',false); end if;
 return jsonb_build_object('valid',true,'discount_percent',c.discount_percent,'price_cents',v_price,
  'discounted_cents',greatest(200,v_price-((v_price*c.discount_percent+50)/100)));
end $$;