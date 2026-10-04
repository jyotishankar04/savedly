import { validate } from "../../../shared/middlewares/validate";
import { listCampaignMessagesQuerySchema, listCampaignsQuerySchema, sendEmailSchema } from "./email.schema";

export const validateSendEmail = validate(sendEmailSchema);
export const validateListCampaigns = validate(listCampaignsQuerySchema, "query");
export const validateListCampaignMessages = validate(listCampaignMessagesQuerySchema, "query");
