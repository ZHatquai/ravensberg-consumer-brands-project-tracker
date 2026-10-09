-- the probe functions of 9 Oct 2026 (used to find out why the migration tool hung) are removed; nobody could call them
drop function if exists public.demo_probe();
drop function if exists public.demo_probe1();
drop function if exists public.demo_probe2();
drop function if exists public.demo_probe3();
