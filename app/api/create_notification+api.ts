import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return Response.json(
                { error: "Missing Supabase configuration" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const { user_id, message } = await request.json();

        if (!user_id || !message) {
            return Response.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if notification already exists today
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const todayString = `${year}-${month}-${day}`;

        const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", user_id)
            .eq("message", message)
            .gte("created_at", new Date(todayString + "T00:00:00").toISOString())
            .maybeSingle();

        if (existing) {
            return Response.json({ success: true, exists: true });
        }

        // Create notification
        const { data, error } = await supabase
            .from("notifications")
            .insert({
                user_id,
                message,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating notification:", error);
            return Response.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return Response.json({ success: true, data });
    } catch (error) {
        console.error("Error in create_notification:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
