
-- Create trigger for new message notifications
DROP TRIGGER IF EXISTS trigger_new_message_notification ON public.messages;

CREATE TRIGGER trigger_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_message_email();
