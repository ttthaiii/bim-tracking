'use client';
import { useEffect, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useDashboard } from '@/context/DashboardContext';

interface Project {
  id: string;
  name: string;
}

export default function ProjectSelector() {
  const { selectedProject, setSelectedProject } = useDashboard();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentSelectionName, setCurrentSelectionName] = useState('All Projects');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projectList: Project[] = projectsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
        setProjects([{ id: 'all', name: 'All Projects' }, ...projectList]);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const selected = projects.find(p => p.id === selectedProject);
    setCurrentSelectionName(selected ? selected.name : 'All Projects');
  }, [selectedProject, projects]);

  return (
    <Listbox value={selectedProject} onChange={setSelectedProject}>
      <div className="relative mt-1">
        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
          <span className="block truncate text-gray-900">{currentSelectionName}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as="div" // Using div instead of React.Fragment to avoid rendering issues
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {projects.map((project, projectIdx) => (
              <Listbox.Option
                key={projectIdx}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'}`
                }
                value={project.id}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
                    >
                      {project.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
