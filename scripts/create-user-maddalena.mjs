
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'maddalena.giovanardi@gmail.com';
const password = crypto.randomBytes(8).toString('hex') + 'A1!'; // Ensure strong password

async function registerUser() {
    console.log(`Attempting to register user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
        process.exit(1);
    }

    console.log('User registration initiated successfully!');
    console.log('---------------------------------------');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('---------------------------------------');

    if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.log("User already exists or there was an issue with identities.");
    } else if (!data.session) {
        console.log("Please check the email for a confirmation link to complete registration.");
    } else {
        console.log("User registered and logged in (Email confirmation might be disabled).");
    }
}

registerUser();
