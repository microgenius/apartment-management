import { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { DEFAULT_LATE_FEE, type LateFeeConfig } from '../utils/helpers';
import type { BankInfo } from '../types';

export function useSettings() {
  const [meetingDate, setMeetingDate] = useState<string>('2024-07-15');
  const [monthlyDue, setMonthlyDue] = useState<number>(0);
  const [debtStartDate, setDebtStartDate] = useState<string>('2024-01-01');
  const [lateFee, setLateFee] = useState<LateFeeConfig>(DEFAULT_LATE_FEE);
  const [bankInfo, setBankInfo] = useState<BankInfo>({ iban: '', holder: '' });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const date = await settingsService.getMeetingDate();
      const due = await settingsService.getMonthlyDue();
      const startDate = await settingsService.getDebtStartDate();
      const fee = await settingsService.getLateFeeConfig();
      const bank = await settingsService.getBankInfo();
      setMeetingDate(date);
      setMonthlyDue(due);
      setDebtStartDate(startDate);
      setLateFee(fee);
      setBankInfo(bank);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingDate = async (date: string) => {
    try {
      await settingsService.setMeetingDate(date);
      setMeetingDate(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting date');
      console.error('Error updating meeting date:', err);
      throw err;
    }
  };

  const updateMonthlyDue = async (amount: number) => {
    try {
      await settingsService.setMonthlyDue(amount);
      setMonthlyDue(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update monthly due');
      console.error('Error updating monthly due:', err);
      throw err;
    }
  };

  const updateDebtStartDate = async (date: string) => {
    try {
      await settingsService.setDebtStartDate(date);
      setDebtStartDate(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update debt start date');
      console.error('Error updating debt start date:', err);
      throw err;
    }
  };

  const updateLateFee = async (config: LateFeeConfig) => {
    try {
      await settingsService.setLateFeeConfig(config);
      setLateFee(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update late fee settings');
      console.error('Error updating late fee settings:', err);
      throw err;
    }
  };

  const updateBankInfo = async (info: BankInfo) => {
    try {
      await settingsService.setBankInfo(info);
      setBankInfo({ iban: info.iban.trim(), holder: info.holder.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bank info');
      console.error('Error updating bank info:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    meetingDate,
    setMeetingDate: updateMeetingDate,
    monthlyDue,
    setMonthlyDue: updateMonthlyDue,
    debtStartDate,
    setDebtStartDate: updateDebtStartDate,
    lateFee,
    setLateFee: updateLateFee,
    bankInfo,
    setBankInfo: updateBankInfo,
    loading,
    error,
    refetch: fetchSettings
  };
}
