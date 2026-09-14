import { useEffect } from "react";
import ServiceCard from "../../components/services/ServiceCard";
import useService from "../../hooks/useService";

function Services() {
	const { services, loading, error, fetchServices } = useService();

	useEffect(() => {
		fetchServices();
	}, [fetchServices]);

	return (
		<main className="page-container">
			<div className="page-header">
				<span className="eyebrow">KU MARKET SERVICES</span>
				<h1>Services around campus</h1>
				<p>Find trusted student providers for your next task.</p>
			</div>

			{loading && <p>Loading services...</p>}
			{error && <p role="alert">{error}</p>}
			{!loading && !error && services.length === 0 && (
				<div className="empty-state">
					<h2>No services available yet.</h2>
					<p>Check back soon.</p>
				</div>
			)}
			{!loading && !error && services.length > 0 && (
				<div className="services-grid">
					{services.map((service) => (
						<ServiceCard key={service.id} service={service} />
					))}
				</div>
			)}
		</main>
	);
}

export default Services;
