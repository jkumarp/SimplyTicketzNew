// services/loggerService.ts

import { supabase } from "../config/supabase";

export async function logError(data: {
    level: string;
    module?: string;
    function_name?: string;
    merchant_id?: number;
    user_id?: number;
    request_id?: string;
    method?: string;
    endpoint?: string;
    ip_address?: string;
    status_code?: number;
    error_message: string;
    stack_trace?: string;
    request_body?: any;
    request_query?: any;
    request_params?: any;
    supabase_error?: any;
    execution_time_ms?: number;
}) {

    await supabase
        .schema("audit")
        .from("error_log")
        .insert(data);

}