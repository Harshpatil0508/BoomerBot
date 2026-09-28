import pandas as pd
import io

def scan_dataset(file_bytes: bytes):
    # Load all sheets
    try:
        excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
    except Exception as e:
        return {"error": f"Failed to read Excel file: {str(e)}"}
        
    sheets = excel_file.sheet_names
    required_sheets = ["Knowledge_Domains", "Employees", "Question_Bank", "Interview_Sessions", 
                      "Interview_Responses", "Knowledge_Articles", "Access_Control", "Assistant_Interactions"]
                      
    for s in required_sheets:
        if s not in sheets:
            return {"error": f"Missing required sheet: {s}"}
            
    df_domains = pd.read_excel(excel_file, sheet_name="Knowledge_Domains")
    df_employees = pd.read_excel(excel_file, sheet_name="Employees")
    df_questions = pd.read_excel(excel_file, sheet_name="Question_Bank")
    df_sessions = pd.read_excel(excel_file, sheet_name="Interview_Sessions")
    df_responses = pd.read_excel(excel_file, sheet_name="Interview_Responses")
    df_articles = pd.read_excel(excel_file, sheet_name="Knowledge_Articles")
    df_access = pd.read_excel(excel_file, sheet_name="Access_Control")
    df_interactions = pd.read_excel(excel_file, sheet_name="Assistant_Interactions")
    
    anomalies = {}

    # SC-00: Critical holder, no capture
    try:
        crit_emps = df_employees[(df_employees['knowledge_criticality'] == 'High') & 
                                 (df_employees['employment_status'].isin(['Notice Period', 'Retiring']))]
        if not crit_emps.empty and not df_sessions.empty:
            sc00_df = crit_emps[~crit_emps['employee_id'].isin(df_sessions['employee_id'])]
            anomalies["SC-00"] = {
                "title": "Critical holder, no capture",
                "description": "High-criticality employees on Notice/Retiring with NO interview session.",
                "count": len(sc00_df),
                "records": sc00_df[['employee_id', 'full_name', 'employment_status']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-00: {e}")

    # SC-01: Orphan interview responses
    try:
        if not df_responses.empty and not df_sessions.empty:
            sc01_df = df_responses[~df_responses['session_id'].isin(df_sessions['session_id'])]
            anomalies["SC-01"] = {
                "title": "Orphan interview responses",
                "description": "Responses whose session_id does not exist in Interview_Sessions.",
                "count": len(sc01_df),
                "records": sc01_df[['response_id', 'session_id']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-01: {e}")

    # SC-02: Post-exit authorship
    try:
        if not df_articles.empty and not df_employees.empty:
            df_art_emp = df_articles.merge(df_employees, left_on='author_employee_id', right_on='employee_id', how='inner')
            df_art_emp = df_art_emp.dropna(subset=['planned_exit_date'])
            df_art_emp['created_date'] = pd.to_datetime(df_art_emp['created_date'])
            df_art_emp['planned_exit_date'] = pd.to_datetime(df_art_emp['planned_exit_date'])
            sc02_df = df_art_emp[df_art_emp['created_date'] > df_art_emp['planned_exit_date']]
            anomalies["SC-02"] = {
                "title": "Post-exit authorship",
                "description": "Articles with created_date later than the author's planned_exit_date.",
                "count": len(sc02_df),
                "records": sc02_df[['article_id', 'author_employee_id', 'created_date', 'planned_exit_date']].assign(
                    created_date=lambda x: x['created_date'].astype(str),
                    planned_exit_date=lambda x: x['planned_exit_date'].astype(str)
                ).to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-02: {e}")

    # SC-03: Draft/Archived served to users
    try:
        if not df_interactions.empty and not df_articles.empty:
            df_int_art = df_interactions.dropna(subset=['matched_article_id']).merge(
                df_articles, left_on='matched_article_id', right_on='article_id', how='inner'
            )
            sc03_df = df_int_art[df_int_art['status'] != 'Published']
            anomalies["SC-03"] = {
                "title": "Draft/Archived served to users",
                "description": "Assistant answered using a non-Published article.",
                "count": len(sc03_df),
                "records": sc03_df[['interaction_id', 'matched_article_id', 'status']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-03: {e}")

    # SC-04: RBAC violation
    try:
        if not df_access.empty and not df_articles.empty:
            broad_groups = ['All-Employees', 'External-Contractors', 'New-Hires']
            df_acc_art = df_access.merge(df_articles, on='article_id', how='inner')
            sc04_df = df_acc_art[(df_acc_art['sensitivity'].isin(['Restricted', 'Confidential'])) & 
                                 (df_acc_art['role_or_group'].isin(broad_groups))]
            anomalies["SC-04"] = {
                "title": "RBAC violation",
                "description": "Restricted/Confidential articles granted to broad groups.",
                "count": len(sc04_df),
                "records": sc04_df[['access_id', 'article_id', 'role_or_group', 'sensitivity']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-04: {e}")

    # SC-05: Unconverted knowledge gaps
    try:
        if not df_responses.empty:
            sc05_df = df_responses[(df_responses['gap_flag'] == 'Y') & 
                                   (df_responses['converted_to_article_id'].isna() | (df_responses['converted_to_article_id'] == ''))]
            anomalies["SC-05"] = {
                "title": "Unconverted knowledge gaps",
                "description": "Responses with gap_flag = Y that never converted to an article.",
                "count": len(sc05_df),
                "records": sc05_df[['response_id', 'session_id', 'gap_flag']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-05: {e}")

    # SC-06: Duplicate articles
    try:
        if not df_articles.empty:
            counts = df_articles.groupby(['title', 'semantic_tags']).size().reset_index(name='count')
            dupes = counts[counts['count'] > 1]
            sc06_df = df_articles.merge(dupes, on=['title', 'semantic_tags'], how='inner')
            anomalies["SC-06"] = {
                "title": "Duplicate articles",
                "description": "Two+ articles sharing identical title and tags but different article_id.",
                "count": len(sc06_df),
                "records": sc06_df[['article_id', 'title', 'semantic_tags']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-06: {e}")

    # SC-07: False-complete sessions
    try:
        if not df_sessions.empty:
            sc07_df = df_sessions[(df_sessions['status'] == 'Completed') & (df_sessions['completion_pct'] < 80)]
            anomalies["SC-07"] = {
                "title": "False-complete sessions",
                "description": "Sessions marked Completed but completion_pct < 80.",
                "count": len(sc07_df),
                "records": sc07_df[['session_id', 'status', 'completion_pct']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-07: {e}")

    # SC-08: Orphan domain reference
    try:
        if not df_articles.empty and not df_domains.empty:
            sc08_df = df_articles[~df_articles['domain_id'].isin(df_domains['domain_id'])]
            anomalies["SC-08"] = {
                "title": "Orphan domain reference",
                "description": "Article referencing a domain_id absent from Knowledge_Domains.",
                "count": len(sc08_df),
                "records": sc08_df[['article_id', 'domain_id']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-08: {e}")

    # SC-09: Past-exit still Active
    try:
        if not df_employees.empty:
            df_emp = df_employees.dropna(subset=['planned_exit_date']).copy()
            df_emp['planned_exit_date'] = pd.to_datetime(df_emp['planned_exit_date'])
            ref_date = pd.to_datetime('2026-09-11')
            sc09_df = df_emp[(df_emp['planned_exit_date'] < ref_date) & (df_emp['employment_status'] == 'Active')]
            anomalies["SC-09"] = {
                "title": "Past-exit still Active",
                "description": "Employees whose planned_exit_date has passed but employment_status is still Active.",
                "count": len(sc09_df),
                "records": sc09_df[['employee_id', 'employment_status', 'planned_exit_date']].assign(
                    planned_exit_date=lambda x: x['planned_exit_date'].astype(str)
                ).to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-09: {e}")

    # SC-10: Assistant coverage gap
    try:
        if not df_interactions.empty:
            bad_queries = df_interactions[(df_interactions['answer_provided'] == 'N') | 
                                          (df_interactions['satisfaction_score'] <= 2)]
            sc10_df = bad_queries
            anomalies["SC-10"] = {
                "title": "Assistant coverage gap",
                "description": "Clusters of unanswered / low-satisfaction queries.",
                "count": len(sc10_df),
                "records": sc10_df[['interaction_id', 'query_text', 'answer_provided', 'satisfaction_score']].fillna('').to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-10: {e}")

    # SC-11: Never-asked questions
    try:
        if not df_questions.empty and not df_responses.empty:
            sc11_df = df_questions[~df_questions['question_id'].isin(df_responses['question_id'])]
            anomalies["SC-11"] = {
                "title": "Never-asked questions",
                "description": "Question_Bank items never used in any captured response.",
                "count": len(sc11_df),
                "records": sc11_df[['question_id', 'domain_id', 'question_text']].to_dict('records')
            }
    except Exception as e:
        print(f"Error SC-11: {e}")

    # Convert dataframe objects and NaN to clean json values before returning
    import math
    def clean_records(records):
        for row in records:
            for k, v in row.items():
                if isinstance(v, float) and math.isnan(v):
                    row[k] = None
        return records

    for k, v in anomalies.items():
        v['records'] = clean_records(v['records'])

    return anomalies
