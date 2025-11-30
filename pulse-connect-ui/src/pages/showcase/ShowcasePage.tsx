import React from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import { ShowcaseHeader } from "../../components/ShowcaseHeader";
import { SkillCard } from "../../components/SkillCard";
import { Celebrate } from "../../components/Celebrate";

const ShowcasePage: React.FC = () => {
  const { user, skills, region } = useUserProfile();

  return (
    <div className="showcase-page">
      <ShowcaseHeader name={user.name} region={region} />
      <section className="skills-grid">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} region={region} />
        ))}
      </section>
      <Celebrate trigger="profile_view" region={region} />
    </div>
  );
};

export default ShowcasePage;
