-- Em caso de histórico de dispositivo, preserve a classificação para auditoria.
create or replace function public.aeromind_support_chat_send(
 p_ticket_id uuid,p_message text,p_subject text default 'Atendimento AeroMind'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); is_staff boolean; owner_id uuid; state text;
 t uuid; message_id uuid; recent integer;
begin
 if actor is null then raise exception 'Faça login para conversar' using errcode='42501';end if;
 if p_message is null or length(btrim(p_message)) not between 2 and 3000
 then raise exception 'Mensagem entre 2 e 3000 caracteres' using errcode='22023';end if;
 is_staff:=private.aeromind_verified_staff();
 if not is_staff then
   select count(*) into recent from public.aeromind_support_messages
   where author_id=actor and created_at>clock_timestamp()-interval '10 minutes';
   if recent>=24 then raise exception 'Aguarde antes de enviar novas mensagens' using errcode='22023';end if;
 end if;
 if p_ticket_id is null then
  if is_staff then raise exception 'Escolha uma conversa de cliente' using errcode='22023';end if;
  if length(btrim(coalesce(p_subject,''))) not between 5 and 140
  then raise exception 'Assunto inválido' using errcode='22023';end if;
  insert into public.aeromind_support_tickets(user_id,subject,category,status)
  values(actor,btrim(p_subject),case when p_subject ilike '%dispositivo%' then 'dispositivo' else 'geral' end,'open') returning id into t;
 else
  select user_id,status into owner_id,state from public.aeromind_support_tickets where id=p_ticket_id for update;
  if not found or (not is_staff and owner_id<>actor) then
   raise exception 'Conversa não encontrada' using errcode='42501';end if;
  if state='resolved' and not is_staff then
    raise exception 'Conversa encerrada; inicie outra' using errcode='22023';end if;
  t:=p_ticket_id;
 end if;
 insert into public.aeromind_support_messages(ticket_id,author_id,content)
 values(t,actor,btrim(p_message)) returning id into message_id;
 if is_staff then
  update public.aeromind_support_tickets set status='in_progress',staff_seen_at=clock_timestamp() where id=t;
 else
  update public.aeromind_support_tickets set
    customer_seen_at=clock_timestamp(),status='open' where id=t and status<>'resolved';
 end if;
 return jsonb_build_object('ok',true,'ticket_id',t,'message_id',message_id);
end $$;

