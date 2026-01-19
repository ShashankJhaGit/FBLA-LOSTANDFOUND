import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadButton } from "@/components/UploadButton";
import { Search, Package, CheckCircle, Info, LogOut, X } from "lucide-react";
import { LostItemORM, LostItemCategory, LostItemStatus, type LostItemModel } from "@/sdk/database/orm/orm_lost_item";
import { ClaimORM, ClaimClaimStatus, type ClaimModel } from "@/sdk/database/orm/orm_claim";
import { AdminORM, type AdminModel } from "@/sdk/database/orm/orm_admin";
import { request as sendEmail } from "@/sdk/mcp-clients/686de5276fd1cae1afbb55be/GMAIL_SEND_EMAIL";

export const Route = createFileRoute("/")({
	component: App,
});

const categoryOptions = [
	{ value: LostItemCategory.Electronics, label: "Electronics" },
	{ value: LostItemCategory.Books, label: "Books" },
	{ value: LostItemCategory.Clothing, label: "Clothing" },
	{ value: LostItemCategory.Accessories, label: "Accessories" },
	{ value: LostItemCategory.Keys, label: "Keys" },
	{ value: LostItemCategory.Bags, label: "Bags" },
	{ value: LostItemCategory.SportsEquipment, label: "Sports Equipment" },
	{ value: LostItemCategory.Miscellaneous, label: "Miscellaneous" },
];

function App() {
	const [isAdminMode, setIsAdminMode] = useState(false);
	const [adminPassword, setAdminPassword] = useState("");
	const [showLoginDialog, setShowLoginDialog] = useState(false);
	const [loginError, setLoginError] = useState("");

	// Hard-coded admin password
	const ADMIN_PASSWORD = "Let$pl@y!09";

	useEffect(() => {
		// Initialize admin in database when app loads
		const initializeAdmin = async () => {
			try {
				const adminORM = AdminORM.getInstance();
				const admins = await adminORM.getAllAdmin();

				if (admins.length === 0) {
					await adminORM.insertAdmin([{
						username: "admin",
						password_hash: ADMIN_PASSWORD,
					} as AdminModel]);
				} else {
					const existingAdmin = admins[0];
					if (existingAdmin.password_hash !== ADMIN_PASSWORD) {
						await adminORM.setAdminById(existingAdmin.id, {
							...existingAdmin,
							password_hash: ADMIN_PASSWORD,
						});
					}
				}
			} catch (error) {
				console.error("Failed to initialize admin:", error);
			}
		};

		initializeAdmin();
	}, []);

	const handleAdminLogin = () => {
		console.log("Login attempted with password:", adminPassword);
		console.log("Expected password:", ADMIN_PASSWORD);
		
		if (!adminPassword) {
			setLoginError("Please enter a password");
			return;
		}

		// Check password directly without making API calls
		if (adminPassword === ADMIN_PASSWORD) {
			console.log("Login successful!");
			setIsAdminMode(true);
			setShowLoginDialog(false);
			setLoginError("");
			setAdminPassword("");
		} else {
			console.log("Invalid password");
			setLoginError("Invalid password");
		}
	};

	const handleAdminLogout = () => {
		setIsAdminMode(false);
		setAdminPassword("");
	};

	return (
		<div className="min-h-screen bg-zinc-50">
			{/* Navigation */}
			<nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					<div className="flex items-center gap-2">
						<Package className="h-6 w-6 text-blue-500" />
						<span className="text-xl font-bold text-zinc-900">School Lost & Found</span>
					</div>
					<div className="flex items-center gap-4">
						<a href="#home" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Home</a>
						<a href="#browse" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Browse Items</a>
						<a href="#report" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Report Found Item</a>
						{isAdminMode ? (
							<Button variant="outline" size="sm" onClick={handleAdminLogout} className="border-zinc-300 text-zinc-900 hover:bg-zinc-100">
								<LogOut className="mr-2 h-4 w-4" />
								Logout
							</Button>
						) : (
							<Button variant="outline" size="sm" onClick={() => setShowLoginDialog(true)} className="border-zinc-300 text-black hover:bg-zinc-100">
								Admin
							</Button>
						)}
					</div>
				</div>
			</nav>

			{/* Admin Login Dialog */}
			<Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Admin Login</DialogTitle>
						<DialogDescription>Enter your admin password to access the dashboard</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={adminPassword}
								onChange={(e) => setAdminPassword(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
							/>
						</div>
						{loginError && (
							<Alert variant="destructive">
								<AlertDescription>{loginError}</AlertDescription>
							</Alert>
						)}
						<Button className="w-full" onClick={handleAdminLogin}>Login</Button>
					</div>
				</DialogContent>
			</Dialog>

			{isAdminMode ? <AdminDashboard /> : <PublicView />}
		</div>
	);
}

function PublicView() {
	return (
		<>
			<HeroSection />
			<BrowseItemsSection />
			<ReportFoundItemSection />
		</>
	);
}

function HeroSection() {
	const { data: stats } = useQuery({
		queryKey: ["stats"],
		queryFn: async () => {
			const itemORM = LostItemORM.getInstance();
			const allItems = await itemORM.getAllLostItem();
			const activeItems = allItems.filter(item => item.status === LostItemStatus.Active);
			const claimedItems = allItems.filter(item => item.status === LostItemStatus.Claimed);

			return {
				total: allItems.length,
				active: activeItems.length,
				claimed: claimedItems.length,
			};
		},
		refetchInterval: 5000,
	});

	return (
		<section id="home" className="border-b bg-white py-16">
			<div className="container mx-auto px-4 text-center">
				<h1 className="mb-4 text-5xl font-bold text-zinc-900">Lost Something? We're Here to Help</h1>
				<p className="mb-8 text-lg text-zinc-600">Browse found items or report what you've found</p>
				<div className="flex justify-center gap-4">
					<Button size="lg" className="bg-zinc-900 hover:bg-zinc-800" onClick={() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" })}>
						<Search className="mr-2 h-5 w-5" />
						Search Lost Items
					</Button>
					<Button size="lg" variant="outline" className="border-zinc-300 text-zinc-900 hover:bg-zinc-100" onClick={() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" })}>
						Report Found Item
					</Button>
				</div>

				{/* Stats Bar */}
				<div className="mt-12 flex justify-center">
					<Card className="border-zinc-200 bg-white">
						<CardHeader className="pb-2">
							<CardTitle className="text-4xl font-bold text-blue-500">{stats?.active || 0}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm font-medium text-zinc-600">Active Listings</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}

function BrowseItemsSection() {
	const [selectedItem, setSelectedItem] = useState<LostItemModel | null>(null);

	const { data: items = [] } = useQuery({
		queryKey: ["active-items"],
		queryFn: async () => {
			// Try localStorage first
			try {
				const local = JSON.parse(localStorage.getItem("active_items") || "[]") as LostItemModel[];
				if (local.length > 0) {
					console.log("Loaded active items from localStorage:", local);
					return local;
				}
			} catch (err) {
				console.error("Failed to read active_items from localStorage:", err);
			}

			// Fallback to DB
			try {
				const itemORM = LostItemORM.getInstance();
				const dbItems = await itemORM.getLostItemByStatus(LostItemStatus.Active);
				console.log("Loaded active items from DB:", dbItems);
				return dbItems;
			} catch (err) {
				console.error("Failed to load active items from DB:", err);
				return [];
			}
		},
	});

	return (
		<section id="browse" className="bg-zinc-50 py-16">
			<div className="container mx-auto px-4">
				<h2 className="mb-8 text-3xl font-bold text-zinc-900">Browse Lost Items</h2>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<Card key={item.id} className="cursor-pointer border-zinc-200 transition hover:border-blue-400 hover:shadow-lg" onClick={() => setSelectedItem(item)}>
							{item.photo_url && (
								<div className="aspect-video w-full overflow-hidden rounded-t-lg">
									<img src={item.photo_url} alt={item.item_name} className="h-full w-full object-cover" />
								</div>
							)}
							<CardHeader>
								<CardTitle>{item.item_name}</CardTitle>
								<CardDescription>{item.location_found}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</div>

			{selectedItem && (
				<ItemDetailModal
					item={selectedItem}
					open={!!selectedItem}
					onClose={() => setSelectedItem(null)}
				/>
			)}
		</section>
	);
}

function ItemDetailModal({ item, open, onClose }: { item: LostItemModel; open: boolean; onClose: () => void }) {
	const [showClaimForm, setShowClaimForm] = useState(false);

	if (showClaimForm) {
		return <ClaimFormModal item={item} open={open} onClose={onClose} />;
	}

	const category = categoryOptions.find(c => c.value === item.category)?.label || "Unknown";

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{item.item_name}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{item.photo_url && (
						<div className="aspect-video w-full overflow-hidden rounded-lg">
							<img src={item.photo_url} alt={item.item_name} className="h-full w-full object-cover" />
						</div>
					)}
					<div className="grid gap-2">
						<div>
							<Label>Description</Label>
							<p className="text-sm text-zinc-700">{item.description || "No description provided"}</p>
						</div>
						<div>
							<Label>Category</Label>
							<p className="text-sm text-zinc-700">{category}</p>
						</div>
						<div>
							<Label>Date Found</Label>
							<p className="text-sm text-zinc-700">{item.date_found}</p>
						</div>
						<div>
							<Label>Location Found</Label>
							<p className="text-sm text-zinc-700">{item.location_found}</p>
						</div>
					</div>
					<Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={() => setShowClaimForm(true)}>
						Request Pickup
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ClaimFormModal({ item, open, onClose }: { item: LostItemModel; open: boolean; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		student_name: "",
		student_id: "",
		student_email: "",
		grade: "",
		homeroom_teacher: "",
		pickup_time_slot: "",
	});

	const claimMutation = useMutation({
		mutationFn: async (data: typeof formData) => {
			const newClaim: ClaimModel = {
				id: `claim-${Date.now()}`,
				item_id: item.id,
				student_name: data.student_name,
				student_id: data.student_id,
				student_email: data.student_email,
				grade: data.grade,
				homeroom_teacher: data.homeroom_teacher,
				pickup_time_slot: data.pickup_time_slot,
				claim_status: ClaimClaimStatus.Pending,
				data_creator: "local-user",
				data_updater: "local-user",
				create_time: Math.floor(Date.now() / 1000).toString(),
				update_time: Math.floor(Date.now() / 1000).toString(),
			};

			// Save claim to localStorage as backup
			try {
				const existing = JSON.parse(localStorage.getItem("claims") || "[]") as ClaimModel[];
				existing.push(newClaim);
				localStorage.setItem("claims", JSON.stringify(existing));
				console.log("Saved claim to localStorage:", newClaim);
			} catch (err) {
				console.error("Failed to save claim to localStorage:", err);
			}

			// Update item status in localStorage active_items -> Pending
			try {
				const activeItems = JSON.parse(localStorage.getItem("active_items") || "[]") as LostItemModel[];
				const idx = activeItems.findIndex((i) => i.id === item.id);
				if (idx >= 0) {
					activeItems[idx] = { ...activeItems[idx], status: LostItemStatus.Pending };
					localStorage.setItem("active_items", JSON.stringify(activeItems));
				}
			} catch (err) {
				console.error("Failed to update active_items in localStorage:", err);
			}

			// Try to save to database
			try {
				const claimORM = ClaimORM.getInstance();
				const itemORM = LostItemORM.getInstance();
				await claimORM.insertClaim([newClaim]);
				const updatedItem = { ...item, status: LostItemStatus.Pending };
				await itemORM.setLostItemById(item.id, updatedItem);
			} catch (err) {
				console.error("Failed to save claim to database, using localStorage instead:", err);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["active-items"] });
			queryClient.invalidateQueries({ queryKey: ["stats"] });
			onClose();
		},
	});

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Request Pickup for {item.item_name}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<Alert>
						<Info className="h-4 w-4" />
						<AlertDescription>
							You will need your student ID when coming to pick up your lost item at the front desk
						</AlertDescription>
					</Alert>

					<div className="grid gap-4">
						<div>
							<Label htmlFor="student_name">Name *</Label>
							<Input
								id="student_name"
								value={formData.student_name}
								onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="student_id">Student ID *</Label>
							<Input
								id="student_id"
								value={formData.student_id}
								onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="student_email">Student Email *</Label>
							<Input
								id="student_email"
								type="email"
								value={formData.student_email}
								onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="grade">Grade *</Label>
							<Input
								id="grade"
								value={formData.grade}
								onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="homeroom_teacher">Homeroom Teacher *</Label>
							<Input
								id="homeroom_teacher"
								value={formData.homeroom_teacher}
								onChange={(e) => setFormData({ ...formData, homeroom_teacher: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="pickup_time_slot">Preferred Pickup Time *</Label>
							<Input
								id="pickup_time_slot"
								placeholder="e.g., After school 3-4 PM"
								value={formData.pickup_time_slot}
								onChange={(e) => setFormData({ ...formData, pickup_time_slot: e.target.value })}
							/>
						</div>
					</div>

					<Button
						className="w-full bg-blue-500 hover:bg-blue-600"
						onClick={() => claimMutation.mutate(formData)}
						disabled={claimMutation.isPending}
					>
						{claimMutation.isPending ? "Submitting..." : "Submit Pickup Request"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ReportFoundItemSection() {
	const queryClient = useQueryClient();
	const [photoUrl, setPhotoUrl] = useState("");
	const [formData, setFormData] = useState({
		item_name: "",
		description: "",
		category: LostItemCategory.Miscellaneous,
		date_found: "",
		location_found: "",
		finder_name: "",
		finder_email: "",
	});

	const reportMutation = useMutation({
		mutationFn: async (data: typeof formData & { photo_url: string }) => {
			// Create item with a local ID
			const newItem: LostItemModel = {
				id: `item-${Date.now()}`,
				photo_url: data.photo_url,
				item_name: data.item_name,
				description: data.description,
				category: data.category,
				date_found: data.date_found,
				location_found: data.location_found,
				finder_name: data.finder_name || null,
				finder_email: data.finder_email || null,
				status: LostItemStatus.Pending,
				data_creator: "local-user",
				data_updater: "local-user",
				create_time: Math.floor(Date.now() / 1000).toString(),
				update_time: Math.floor(Date.now() / 1000).toString(),
			};

			// Store in localStorage as backup
			try {
				const existingItems = JSON.parse(localStorage.getItem("pending_items") || "[]");
				existingItems.push(newItem);
				localStorage.setItem("pending_items", JSON.stringify(existingItems));
				console.log("Report saved to localStorage:", newItem);
			} catch (err) {
				console.error("Failed to save to localStorage:", err);
			}

			// Try to save to database
			try {
				const itemORM = LostItemORM.getInstance();
				await itemORM.insertLostItem([newItem]);
			} catch (err) {
				console.error("Failed to save to database, using localStorage instead:", err);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stats"] });
			queryClient.invalidateQueries({ queryKey: ["pending-items"] });
			setFormData({
				item_name: "",
				description: "",
				category: LostItemCategory.Miscellaneous,
				date_found: "",
				location_found: "",
				finder_name: "",
				finder_email: "",
			});
			setPhotoUrl("");
			alert("Thank you! Your submission will be reviewed by an administrator.");
		},
	});

	return (
		<section id="report" className="border-t bg-white py-16">
			<div className="container mx-auto px-4">
				<div className="mx-auto max-w-2xl">
					<h2 className="mb-4 text-3xl font-bold text-zinc-900">Report Found Item</h2>
					<Alert className="mb-6 border-blue-200 bg-blue-50">
						<Info className="h-4 w-4 text-blue-500" />
						<AlertDescription className="text-zinc-700">
							This submission will be reviewed by an administrator before being published
						</AlertDescription>
					</Alert>

					<div className="space-y-4">
						<div>
							<Label htmlFor="photo">Item Photo</Label>
							<UploadButton
								onUploadComplete={(url: string) => setPhotoUrl(url)}
								buttonText="Upload Photo"
							/>
							{photoUrl && <p className="mt-1 text-sm text-zinc-600">Photo uploaded successfully</p>}
						</div>

						<div>
							<Label htmlFor="item_name">Item Name *</Label>
							<Input
								id="item_name"
								value={formData.item_name}
								onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
							/>
						</div>

						<div>
							<Label htmlFor="description">Detailed Description</Label>
							<Textarea
								id="description"
								rows={4}
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							/>
						</div>

						<div>
							<Label htmlFor="category">Category *</Label>
							<Select
								value={formData.category.toString()}
								onValueChange={(value) => setFormData({ ...formData, category: parseInt(value) as LostItemCategory })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{categoryOptions.map((option) => (
										<SelectItem key={option.value} value={option.value.toString()}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="date_found">Date Found *</Label>
							<Input
								id="date_found"
								type="date"
								value={formData.date_found}
								onChange={(e) => setFormData({ ...formData, date_found: e.target.value })}
							/>
						</div>

						<div>
							<Label htmlFor="location_found">Location Found *</Label>
							<Input
								id="location_found"
								placeholder="e.g., Library 2nd Floor"
								value={formData.location_found}
								onChange={(e) => setFormData({ ...formData, location_found: e.target.value })}
							/>
						</div>

						<div>
							<Label htmlFor="finder_name">Your Name (Optional)</Label>
							<Input
								id="finder_name"
								value={formData.finder_name}
								onChange={(e) => setFormData({ ...formData, finder_name: e.target.value })}
							/>
						</div>

						<div>
							<Label htmlFor="finder_email">Your Email (Optional)</Label>
							<Input
								id="finder_email"
								type="email"
								value={formData.finder_email}
								onChange={(e) => setFormData({ ...formData, finder_email: e.target.value })}
							/>
						</div>

						<Button
							className="w-full bg-blue-500 hover:bg-blue-600"
							onClick={() => reportMutation.mutate({ ...formData, photo_url: photoUrl })}
							disabled={reportMutation.isPending}
						>
							{reportMutation.isPending ? "Submitting..." : "Submit Report"}
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

function AdminDashboard() {
	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="mb-8 text-3xl font-bold text-zinc-900">Admin Dashboard</h1>
			<Tabs defaultValue="reports">
				<TabsList className="mb-6 bg-zinc-100">
					<TabsTrigger value="reports" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Pending Reports</TabsTrigger>
					<TabsTrigger value="claims" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Pickup Requests</TabsTrigger>
					<TabsTrigger value="active" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Active Items</TabsTrigger>
				</TabsList>

				<TabsContent value="reports">
					<PendingReportsSection />
				</TabsContent>

				<TabsContent value="claims">
					<PickupRequestsSection />
				</TabsContent>

				<TabsContent value="active">
					<ActiveItemsManagementSection />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function PendingReportsSection() {
	const queryClient = useQueryClient();
	const [editingItem, setEditingItem] = useState<LostItemModel | null>(null);

	const { data: pendingItems = [] } = useQuery({
		queryKey: ["pending-items"],
		queryFn: async () => {
			// First try to get from localStorage
			try {
				const localItems = JSON.parse(localStorage.getItem("pending_items") || "[]") as LostItemModel[];
				console.log("Loaded items from localStorage:", localItems);
				if (localItems.length > 0) {
					return localItems;
				}
			} catch (err) {
				console.error("Failed to read from localStorage:", err);
			}

			// Try to get from database
			try {
				const itemORM = LostItemORM.getInstance();
				const dbItems = await itemORM.getLostItemByStatus(LostItemStatus.Pending);
				console.log("Loaded items from database:", dbItems);
				return dbItems;
			} catch (err) {
				console.error("Failed to load from database:", err);
				return [];
			}
		},
	});

	const approveMutation = useMutation({
		mutationFn: async (item: LostItemModel) => {
			// Remove from pending in localStorage
			try {
				const existingItems = JSON.parse(localStorage.getItem("pending_items") || "[]");
				const filtered = existingItems.filter((i: LostItemModel) => i.id !== item.id);
				localStorage.setItem("pending_items", JSON.stringify(filtered));
			} catch (err) {
				console.error("Failed to update localStorage:", err);
			}

			// Add to active items in localStorage
			try {
				const activeItems = JSON.parse(localStorage.getItem("active_items") || "[]") as LostItemModel[];
				const updated = { ...item, status: LostItemStatus.Active } as LostItemModel;
				const idx = activeItems.findIndex((i) => i.id === item.id);
				if (idx >= 0) {
					activeItems[idx] = updated;
				} else {
					activeItems.push(updated);
				}
				localStorage.setItem("active_items", JSON.stringify(activeItems));
			} catch (err) {
				console.error("Failed to update active_items in localStorage:", err);
			}

			// Try to save to database
			try {
				const itemORM = LostItemORM.getInstance();
				const updatedItem = { ...item, status: LostItemStatus.Active };
				await itemORM.setLostItemById(item.id, updatedItem);
			} catch (err) {
				console.error("Failed to update database:", err);
			}
		},
		onMutate: async (item: LostItemModel) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ["pending-items"] });

			// Snapshot the previous value
			const previousItems = queryClient.getQueryData<LostItemModel[]>(["pending-items"]);

			// Optimistically update to remove the item
			queryClient.setQueryData<LostItemModel[]>(["pending-items"], (old) =>
				old ? old.filter((i) => i.id !== item.id) : []
			);

			// Return context with the snapshot
			return { previousItems };
		},
		onError: (_err, _item, context) => {
			// Rollback on error
			if (context?.previousItems) {
				queryClient.setQueryData(["pending-items"], context.previousItems);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pending-items"] });
			queryClient.invalidateQueries({ queryKey: ["active-items"] });
			queryClient.invalidateQueries({ queryKey: ["stats"] });
			setEditingItem(null);
		},
	});

	const declineMutation = useMutation({
		mutationFn: async (item: LostItemModel) => {
			// Remove from localStorage
			try {
				const existingItems = JSON.parse(localStorage.getItem("pending_items") || "[]");
				const filtered = existingItems.filter((i: LostItemModel) => i.id !== item.id);
				localStorage.setItem("pending_items", JSON.stringify(filtered));
				console.log("Item removed from localStorage:", item.id);
			} catch (err) {
				console.error("Failed to update localStorage:", err);
			}

			// Try to delete from database
			try {
				const itemORM = LostItemORM.getInstance();
				await itemORM.deleteLostItemById(item.id);
			} catch (err) {
				console.error("Failed to delete from database:", err);
			}

			// Try to send email
			try {
				if (item.finder_email) {
					await sendEmail({
						recipient_email: item.finder_email,
						subject: "Lost & Found: Item Report Declined",
						body: `Automated Message. Your found item report for "${item.item_name}" has been declined and will not be published. If you have questions, please contact the front desk.`,
					});
				}
			} catch (err) {
				console.error("Failed to send email:", err);
			}
		},
		onMutate: async (item: LostItemModel) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ["pending-items"] });

			// Snapshot the previous value
			const previousItems = queryClient.getQueryData<LostItemModel[]>(["pending-items"]);

			// Optimistically update to remove the item
			queryClient.setQueryData<LostItemModel[]>(["pending-items"], (old) =>
				old ? old.filter((i) => i.id !== item.id) : []
			);

			// Return context with the snapshot
			return { previousItems };
		},
		onError: (_err, _item, context) => {
			// Rollback on error
			if (context?.previousItems) {
				queryClient.setQueryData(["pending-items"], context.previousItems);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pending-items"] });
			queryClient.invalidateQueries({ queryKey: ["stats"] });
		},
	});

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Pending Item Submissions</h2>
			<div className="grid gap-4">
				{pendingItems.map((item) => (
					<Card key={item.id}>
						<CardHeader>
							<CardTitle>{item.item_name}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<p className="text-sm">
									<strong>Description:</strong> {item.description || "None"}
								</p>
								<p className="text-sm">
									<strong>Category:</strong>{" "}
									{categoryOptions.find((c) => c.value === item.category)?.label}
								</p>
								<p className="text-sm">
									<strong>Date Found:</strong> {item.date_found}
								</p>
								<p className="text-sm">
									<strong>Location:</strong> {item.location_found}
								</p>
								{item.photo_url && (
									<img src={item.photo_url} alt={item.item_name} className="mt-2 h-32 w-32 rounded object-cover" />
								)}
								<div className="flex gap-2 pt-2">
									<Button onClick={() => setEditingItem(item)} variant="outline">
										Edit
									</Button>
									<Button
										onClick={() => approveMutation.mutate(item)}
										disabled={approveMutation.isPending || declineMutation.isPending}
										className="bg-blue-500 hover:bg-blue-600"
									>
										<CheckCircle className="mr-2 h-4 w-4" />
										Approve & Publish
									</Button>
									<Button
										onClick={() => declineMutation.mutate(item)}
										variant="destructive"
										disabled={approveMutation.isPending || declineMutation.isPending}
									>
										<X className="mr-2 h-4 w-4" />
										Decline
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{editingItem && (
				<EditItemModal
					item={editingItem}
					open={!!editingItem}
					onClose={() => setEditingItem(null)}
					onSave={(updated) => approveMutation.mutate(updated)}
				/>
			)}
		</div>
	);
}

function ActiveItemsManagementSection() {
	const queryClient = useQueryClient();

	const { data: activeItems = [] } = useQuery({
		queryKey: ["active-items"],
		queryFn: async () => {
			const itemORM = LostItemORM.getInstance();
			return await itemORM.getLostItemByStatus(LostItemStatus.Active);
		},
	});

	const removeItemMutation = useMutation({
		mutationFn: async (item: LostItemModel) => {
			// Remove from localStorage active_items cache
			try {
				const activeItems = JSON.parse(localStorage.getItem("active_items") || "[]") as LostItemModel[];
				const filtered = activeItems.filter((i) => i.id !== item.id);
				localStorage.setItem("active_items", JSON.stringify(filtered));
				console.log("Item removed from localStorage:", item.id);
			} catch (err) {
				console.error("Failed to update localStorage:", err);
			}

			// Delete from database
			const itemORM = LostItemORM.getInstance();
			await itemORM.deleteLostItemById(item.id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["active-items"] });
			// Also invalidate browse items to force refresh from DB
			queryClient.invalidateQueries({ queryKey: ["active-items"] });
			queryClient.invalidateQueries({ queryKey: ["stats"] });
		},
	});

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Manage Active Items</h2>
			{activeItems.length === 0 ? (
				<p className="text-zinc-500">No active items to manage.</p>
			) : (
				<div className="grid gap-4">
					{activeItems.map((item) => (
						<Card key={item.id}>
							<CardHeader>
								<CardTitle>{item.item_name}</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<p className="text-sm">
										<strong>Category:</strong> {categoryOptions.find((c) => c.value === item.category)?.label}
									</p>
									<p className="text-sm">
										<strong>Location:</strong> {item.location_found}
									</p>
									<p className="text-sm">
										<strong>Date Found:</strong> {item.date_found}
									</p>
									{item.description && (
										<p className="text-sm">
											<strong>Description:</strong> {item.description}
										</p>
									)}
									{item.photo_url && (
										<img src={item.photo_url} alt={item.item_name} className="mt-2 h-32 w-32 rounded object-cover" />
									)}
									<div className="flex gap-2 pt-2">
										<Button
											onClick={() => removeItemMutation.mutate(item)}
											variant="destructive"
											disabled={removeItemMutation.isPending}
										>
											<X className="mr-2 h-4 w-4" />
											Remove Item
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

function EditItemModal({
	item,
	open,
	onClose,
	onSave,
}: {
	item: LostItemModel;
	open: boolean;
	onClose: () => void;
	onSave: (item: LostItemModel) => void;
}) {
	const [formData, setFormData] = useState({ ...item });

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Item</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="edit_item_name">Item Name</Label>
						<Input
							id="edit_item_name"
							value={formData.item_name}
							onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
						/>
					</div>
					<div>
						<Label htmlFor="edit_description">Description</Label>
						<Textarea
							id="edit_description"
							value={formData.description || ""}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						/>
					</div>
					<div>
						<Label htmlFor="edit_category">Category</Label>
						<Select
							value={formData.category.toString()}
							onValueChange={(value) =>
								setFormData({ ...formData, category: parseInt(value) as LostItemCategory })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{categoryOptions.map((option) => (
									<SelectItem key={option.value} value={option.value.toString()}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="edit_location">Location Found</Label>
						<Input
							id="edit_location"
							value={formData.location_found}
							onChange={(e) => setFormData({ ...formData, location_found: e.target.value })}
						/>
					</div>
					<Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={() => onSave(formData)}>
						Save Changes
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function PickupRequestsSection() {
	const queryClient = useQueryClient();

	const { data: allClaims = [] } = useQuery({
		queryKey: ["all-claims"],
		queryFn: async () => {
			// Try localStorage first
			try {
				const local = JSON.parse(localStorage.getItem("claims") || "[]") as ClaimModel[];
				if (local.length > 0) {
					console.log("Loaded claims from localStorage:", local);
					return local;
				}
			} catch (err) {
				console.error("Failed to read claims from localStorage:", err);
			}

			// Fallback to DB
			try {
				const claimORM = ClaimORM.getInstance();
				const db = await claimORM.getAllClaim();
				console.log("Loaded claims from DB:", db);
				return db;
			} catch (err) {
				console.error("Failed to load claims from DB:", err);
				return [];
			}
		},
	});

	const { data: items = [] } = useQuery({
		queryKey: ["all-items-for-claims"],
		queryFn: async () => {
			try {
				const local = JSON.parse(localStorage.getItem("active_items") || "[]") as LostItemModel[];
				if (local.length > 0) {
					console.log("Loaded items for claims from localStorage:", local);
					return local;
				}
			} catch (err) {
				console.error("Failed to read active_items from localStorage:", err);
			}

			try {
				const itemORM = LostItemORM.getInstance();
				const db = await itemORM.getAllLostItem();
				console.log("Loaded items for claims from DB:", db);
				return db;
			} catch (err) {
				console.error("Failed to load items from DB:", err);
				return [];
			}
		},
	});

	const handleClaimAction = useMutation({
		mutationFn: async ({ claim, action }: { claim: ClaimModel; action: "approve" | "decline" }) => {
			// Update claim in localStorage
			try {
				const claims = JSON.parse(localStorage.getItem("claims") || "[]") as ClaimModel[];
				const idx = claims.findIndex((c) => c.id === claim.id);
				const updatedClaim = { ...claim, claim_status: action === "approve" ? ClaimClaimStatus.Approved : ClaimClaimStatus.Declined };
				if (idx >= 0) {
					claims[idx] = updatedClaim;
				} else {
					claims.push(updatedClaim);
				}
				localStorage.setItem("claims", JSON.stringify(claims));
			} catch (err) {
				console.error("Failed to update claims in localStorage:", err);
			}

			// Update item status in localStorage
			try {
				const itemsLocal = JSON.parse(localStorage.getItem("active_items") || "[]") as LostItemModel[];
				const idx = itemsLocal.findIndex((i) => i.id === claim.item_id);
				if (idx >= 0) {
					itemsLocal[idx] = { ...itemsLocal[idx], status: action === "approve" ? LostItemStatus.Claimed : LostItemStatus.Active };
					localStorage.setItem("active_items", JSON.stringify(itemsLocal));
				}
			} catch (err) {
				console.error("Failed to update item status in localStorage:", err);
			}

			// Try to update DB and send email via MCP; on failure, store notification in localStorage
			try {
				const claimORM = ClaimORM.getInstance();
				const itemORM = LostItemORM.getInstance();
				const updatedClaimDb = { ...claim, claim_status: action === "approve" ? ClaimClaimStatus.Approved : ClaimClaimStatus.Declined };
				await claimORM.setClaimById(claim.id, updatedClaimDb);

				if (action === "approve") {
					const claimedItems = await itemORM.getLostItemByIDs([claim.item_id]);
					if (claimedItems[0]) {
						const updatedItem = { ...claimedItems[0], status: LostItemStatus.Claimed };
						await itemORM.setLostItemById(claim.item_id, updatedItem);
					}
				}
			} catch (err) {
				console.error("Failed to update claim/item in DB:", err);
			}

			const item = items.find((i) => i.id === claim.item_id);
			const itemName = item?.item_name || "your requested item";

			const emailBody = action === "approve"
				? `Your request to pick up ${itemName} has been approved. This is an automated message. Do not reply.`
				: `Your request to pick up ${itemName} has been declined. This is an automated message. Do not reply.`;

			const emailPayload = {
				recipient_email: claim.student_email,
				subject: `Lost & Found: Pickup Request ${action === "approve" ? "Approved" : "Declined"}`,
				body: emailBody,
				user_id: "wolfyiscul@gmail.com",
			};

			try {
				await sendEmail(emailPayload);
			} catch (err) {
				console.error("Failed to send email via MCP, saving notification locally:", err);
				try {
					const notifs = JSON.parse(localStorage.getItem("email_notifications") || "[]");
					notifs.push({ to: claim.student_email, subject: emailPayload.subject, body: emailPayload.body, status: "pending" });
					localStorage.setItem("email_notifications", JSON.stringify(notifs));
				} catch (e) {
					console.error("Failed to save email notification:", e);
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["all-claims"] });
			queryClient.invalidateQueries({ queryKey: ["stats"] });
			queryClient.invalidateQueries({ queryKey: ["active-items"] });
		},
	});

	const pendingClaims = allClaims.filter((claim) => claim.claim_status === ClaimClaimStatus.Pending);

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Pickup Requests</h2>
			{pendingClaims.length === 0 ? (
				<p className="text-zinc-500">No pending pickup requests.</p>
			) : (
				<div className="grid gap-4">
					{pendingClaims.map((claim) => {
						const item = items.find((i) => i.id === claim.item_id);

						return (
							<Card key={claim.id}>
								<CardHeader>
									<CardTitle>{claim.student_name}</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<p className="text-sm">
											<strong>Item:</strong> {item?.item_name || "Unknown"}
										</p>
										<p className="text-sm">
											<strong>Student ID:</strong> {claim.student_id}
										</p>
										<p className="text-sm">
											<strong>Email:</strong> {claim.student_email}
										</p>
										<p className="text-sm">
											<strong>Grade:</strong> {claim.grade}
										</p>
										<p className="text-sm">
											<strong>Homeroom Teacher:</strong> {claim.homeroom_teacher}
										</p>
										<p className="text-sm">
											<strong>Pickup Time:</strong> {claim.pickup_time_slot}
										</p>

										<div className="flex gap-2 pt-2">
											<Button
												onClick={() => handleClaimAction.mutate({ claim, action: "approve" })}
												disabled={handleClaimAction.isPending}
												className="bg-blue-500 hover:bg-blue-600"
											>
												Approve
											</Button>
											<Button
												variant="destructive"
												onClick={() => handleClaimAction.mutate({ claim, action: "decline" })}
												disabled={handleClaimAction.isPending}
											>
												Decline
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
