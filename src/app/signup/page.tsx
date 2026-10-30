import { redirect } from 'next/navigation';

export default async function SignUpRedirectPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
            search.set(key, value);
        } else if (Array.isArray(value)) {
            value.forEach(v => search.append(key, v));
        }
    }
    const query = search.toString();
    redirect(`/auth/sign-up${query ? `?${query}` : ''}`);
}
