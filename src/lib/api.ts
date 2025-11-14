const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user_id: string;
  email: string;
  fullName?: string;
  error?: string;
}

interface Schedule {
  _id: string;
  user_id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  timings: string[];
  enabled: boolean;
  created_at: string;
}

interface Prescription {
  _id: string;
  user_id: string;
  raw_text: string;
  structured_data: string;
  created_at: string;
}

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || result.detail || "Login failed");
    }

    return result;
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || result.detail || "Signup failed");
    }

    return result;
  },

  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }
  },

  async me(): Promise<{ user_id: string; email: string; fullName?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    return response.json();
  },
};

export const prescriptionApi = {
  async uploadPrescription(file: File, userId: string): Promise<{
    success: boolean;
    prescription_id: string;
    schedule_ids: string[];
    medicines: any[];
    message: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const response = await fetch(`${API_BASE_URL}/api/upload-prescription`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.detail || "Upload failed");
    }

    return result;
  },

  async getUserSchedules(userId: string): Promise<Schedule[]> {
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}/schedules`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch schedules");
    }

    return response.json();
  },

  async getUserPrescriptions(userId: string): Promise<Prescription[]> {
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}/prescriptions`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch prescriptions");
    }

    return response.json();
  },

  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/toggle-schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ schedule_id: scheduleId, enabled }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.detail || "Toggle failed");
    }

    return result;
  },

  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/schedule/${scheduleId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.detail || "Delete failed");
    }

    return result;
  },
};
