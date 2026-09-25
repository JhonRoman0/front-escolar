"use client";

import { Button, TextField } from "@mui/material";
import { SignInIcon } from "@phosphor-icons/react";

export default function LoginPage() {
    return (
        <main className="grid grid-cols-2 min-h-screen">
            <div className="flex flex-col items-center justify-center">
                <div className="flex w-full max-w-xl flex-col gap-4">
                    <h1 className="text-2xl font-bold text-blue-500">
                        Sistema Escolar
                    </h1>

                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-semibold text-slate-900">
                            ¡Bienvenido!
                        </h2>

                        <p className="text-slate-600">
                            Ingresa con tu código institucional para empezar
                        </p>
                    </div>

                    <TextField
                        name="institutionalCode"
                        label="Código institucional"
                        placeholder="S2026345"
                        variant="outlined"
                        fullWidth
                        slotProps={{
                            inputLabel: {
                                className: "text-slate-600",
                            },
                        }}
                    />
                    <TextField
                        type="password"
                        name="password"
                        label="Contraseña"
                        placeholder="********"
                        variant="outlined"
                        fullWidth
                        slotProps={{
                            inputLabel: {
                                className: "text-slate-600",
                            },
                        }}
                    />

                    <Button variant="outlined" className="flex items-center gap-2 justify-center" size="large">
                        <span>Ingresar</span>
                        <SignInIcon size={16} />
                    </Button>

                    <small className="text-slate-500">
                        ¿Olvidaste tu contraseña?{" "}
                        <a href="#" className="text-blue-500">
                            Contacta al administrador
                        </a>
                    </small>
                </div>

            </div>

            <div className="flex items-center justify-center p-8">
                <div className="flex w-full h-full flex-col gap-4 bg-[#E0E5F8] rounded-4xl p-8 justify-center items-center">
                    <img src="/login-illustration.svg" alt="Ilustración de inicio de sesión" className="w-auto h-96" />
                </div>
            </div>
        </main >
    );
}