// src/components/plans/PlanSuccess.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { handlePlanSuccess, planData } from "../../utils/handlePlanSuccess";

export default function PlanSuccess() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Processando sua compra...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const process = async () => {
      const planParam = searchParams.get("plan");

      if (!planParam || !(planParam in planData)) {
        setMessage("Plano inválido.");
        setLoading(false);
        return;
      }

      try {
        const result = await handlePlanSuccess(planParam as keyof typeof planData);
        setMessage(`Obrigado! Seu plano "${result.name}" foi ativado com sucesso.`);
      } catch (err: any) {
        console.error(err);
        setMessage("Erro ao processar seu plano. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    process();
  }, [searchParams]);

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">🎉 Compra Concluída</h1>
      <p className="text-lg">{loading ? "Carregando..." : message}</p>
    </div>
  );
}
