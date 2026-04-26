-- ============================================================
-- Backfill task_steps for existing tasks that have none
-- ============================================================
-- The original seed data (20260411_reseed_dashboard.sql) inserted
-- tasks directly, bypassing the client-insert trigger that
-- creates task_steps via fn_create_task_steps().
-- This migration retroactively creates pipeline steps for those tasks.

DO $$
DECLARE
  v_task record;
  v_pipeline_key text;
BEGIN
  FOR v_task IN
    SELECT t.id, t.service, t.status, t.progress
    FROM public.tasks t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.task_steps ts WHERE ts.task_id = t.id
    )
  LOOP
    -- Find matching pipeline
    v_pipeline_key := public.fn_match_pipeline_key(v_task.service);

    IF v_pipeline_key IS NOT NULL THEN
      -- Create the steps
      PERFORM public.fn_create_task_steps(v_task.id, v_pipeline_key);

      -- Update the task's pipeline_key if not set
      UPDATE public.tasks
      SET pipeline_key = v_pipeline_key
      WHERE id = v_task.id AND pipeline_key IS NULL;

      -- If task is already in progress or further, advance the first step
      IF v_task.status IN ('In Progress', 'In Review') THEN
        UPDATE public.task_steps
        SET status = 'in_progress',
            started_at = now()
        WHERE task_id = v_task.id
          AND step_index = 0
          AND status = 'pending';
      END IF;

      -- If task is completed, mark all steps completed
      IF v_task.status = 'Completed' THEN
        UPDATE public.task_steps
        SET status = 'completed',
            completed_at = now()
        WHERE task_id = v_task.id;
      END IF;

      -- For tasks with progress > 0, mark appropriate steps
      -- as completed based on the progress percentage
      IF v_task.progress > 0 AND v_task.status != 'Completed' THEN
        DECLARE
          v_total int;
          v_steps_to_complete int;
        BEGIN
          SELECT total_steps INTO v_total
          FROM public.tasks WHERE id = v_task.id;

          IF v_total > 0 THEN
            v_steps_to_complete := floor(v_task.progress::numeric / 100 * v_total);

            -- Mark earlier steps as completed
            IF v_steps_to_complete > 0 THEN
              UPDATE public.task_steps
              SET status = 'completed',
                  completed_at = now()
              WHERE task_id = v_task.id
                AND step_index < v_steps_to_complete;
            END IF;

            -- Mark the current step as in_progress
            UPDATE public.task_steps
            SET status = 'in_progress',
                started_at = now()
            WHERE task_id = v_task.id
              AND step_index = v_steps_to_complete
              AND status = 'pending';
          END IF;
        END;
      END IF;

      -- Try auto-assign if no employee is assigned to the task
      IF NOT EXISTS (
        SELECT 1 FROM public.tasks
        WHERE id = v_task.id AND assigned_employee_email IS NOT NULL
      ) THEN
        PERFORM public.fn_auto_assign_task(v_task.id);
      ELSE
        -- Propagate existing assignment to steps
        UPDATE public.task_steps
        SET assigned_employee_email = (
          SELECT assigned_employee_email FROM public.tasks WHERE id = v_task.id
        )
        WHERE task_id = v_task.id
          AND assigned_employee_email IS NULL;
      END IF;
    END IF;
  END LOOP;
END $$;
